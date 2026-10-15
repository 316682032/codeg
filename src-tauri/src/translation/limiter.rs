//! Client-side pacing per model.
//!
//! Bailian limits each qwen-mt model to 60 requests a minute for the whole
//! account (every key and workspace combined), and may enforce it per second.
//! Staying under it here turns a burst into a short queue instead of a run of
//! 429s. TokenHub publishes no figure, so the same pace is used there.

use std::collections::{HashMap, VecDeque};
use std::sync::{Arc, LazyLock, Mutex};
use std::time::Duration;

use tokio::sync::{OwnedSemaphorePermit, Semaphore};
use tokio::time::Instant;

pub const PER_MINUTE: usize = 60;
/// Requests in flight at once per model. Four concurrent requests to qwen-mt
/// went through without a 429 in testing; three leaves headroom.
pub const IN_FLIGHT: usize = 3;

const WINDOW: Duration = Duration::from_secs(60);

pub struct ModelLimiter {
    in_flight: Arc<Semaphore>,
    started: tokio::sync::Mutex<VecDeque<Instant>>,
    per_minute: usize,
}

impl ModelLimiter {
    pub fn new(per_minute: usize, in_flight: usize) -> Self {
        Self {
            in_flight: Arc::new(Semaphore::new(in_flight)),
            started: tokio::sync::Mutex::new(VecDeque::new()),
            per_minute,
        }
    }

    /// Wait for a free slot and a place in the minute's budget. The permit
    /// holds the in-flight slot until it is dropped.
    pub async fn acquire(&self) -> OwnedSemaphorePermit {
        let permit = self
            .in_flight
            .clone()
            .acquire_owned()
            .await
            .expect("limiter semaphore is never closed");
        loop {
            let mut started = self.started.lock().await;
            let now = Instant::now();
            while started
                .front()
                .is_some_and(|t| now.duration_since(*t) >= WINDOW)
            {
                started.pop_front();
            }
            if started.len() < self.per_minute {
                started.push_back(now);
                return permit;
            }
            let oldest = *started.front().expect("window is full");
            drop(started);
            tokio::time::sleep_until(oldest + WINDOW).await;
        }
    }
}

static LIMITERS: LazyLock<Mutex<HashMap<String, Arc<ModelLimiter>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

/// The shared limiter for one model of one provider.
pub fn for_model(key: &str) -> Arc<ModelLimiter> {
    let mut map = LIMITERS.lock().expect("limiter map");
    map.entry(key.to_string())
        .or_insert_with(|| Arc::new(ModelLimiter::new(PER_MINUTE, IN_FLIGHT)))
        .clone()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test(start_paused = true)]
    async fn requests_past_the_minute_budget_wait_for_the_window() {
        let limiter = ModelLimiter::new(2, 10);
        let start = Instant::now();
        drop(limiter.acquire().await);
        drop(limiter.acquire().await);
        assert_eq!(start.elapsed(), Duration::ZERO);
        drop(limiter.acquire().await);
        assert!(start.elapsed() >= WINDOW, "the third request had to wait");
    }

    #[tokio::test(start_paused = true)]
    async fn in_flight_requests_are_capped() {
        let limiter = Arc::new(ModelLimiter::new(100, 1));
        let first = limiter.acquire().await;
        let waiter = {
            let limiter = limiter.clone();
            tokio::spawn(async move {
                let _second = limiter.acquire().await;
            })
        };
        tokio::time::sleep(Duration::from_millis(10)).await;
        assert!(!waiter.is_finished(), "the second request went ahead");
        drop(first);
        waiter.await.expect("second request");
    }

    #[test]
    fn models_get_separate_limiters() {
        let a = for_model("dashscope/qwen-mt-flash");
        let b = for_model("dashscope/qwen-mt-lite");
        assert!(!Arc::ptr_eq(&a, &b));
        assert!(Arc::ptr_eq(&a, &for_model("dashscope/qwen-mt-flash")));
    }
}

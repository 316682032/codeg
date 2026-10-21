// keh4l build: an `ask_user_question` that returned before the user answered
// (the agent's tool-call deadline), and the answer `get_question_answer`
// collected later.
import { type ReactElement } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { describe, expect, it } from "vitest"

import { AskQuestionResultCard } from "./ask-question-result-card"
import enMessages from "@/i18n/messages/en.json"
import { foldCollectCalls } from "@/lib/image-gen/tool-calls"
import type { AdaptedToolCallPart } from "@/lib/adapters/ai-elements-adapter"

const result = enMessages.Folder.chat.askQuestionResult

const INPUT = JSON.stringify({
  questions: [
    {
      question: "Which approach?",
      header: "Approach",
      multiSelect: false,
      options: [
        { label: "Incremental", description: "Smaller steps" },
        { label: "Rewrite", description: "Start fresh" },
      ],
    },
  ],
})

// What `render_ask_outcome` writes when the wait runs out.
const PENDING = JSON.stringify({
  content: [
    {
      type: "text",
      text: 'The user has not answered yet; the question is still in front of them. Call get_question_answer with question_id "q-1" to keep waiting for the answer.',
    },
  ],
  structuredContent: { pending: true, question_id: "q-1" },
})

const ANSWER = JSON.stringify({
  answers: [
    { header: "Approach", question: "Which approach?", selected: ["Rewrite"] },
  ],
  declined: false,
})

function renderWithIntl(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  )
}

describe("an ask that is still waiting to be collected", () => {
  it("shows as waiting for the answer, not as dismissed", () => {
    renderWithIntl(
      <AskQuestionResultCard
        input={INPUT}
        output={PENDING}
        state="output-available"
      />
    )
    expect(screen.getByText(result.awaiting)).toBeInTheDocument()
    expect(screen.queryByText(result.declined)).toBeNull()
  })

  it("shows the answer once a later collect brought it", () => {
    const ask: AdaptedToolCallPart = {
      type: "tool-call",
      toolCallId: "ask",
      toolName: "mcp__codeg-mcp__ask_user_question",
      input: INPUT,
      state: "output-available",
      output: PENDING,
    }
    const collect: AdaptedToolCallPart = {
      type: "tool-call",
      toolCallId: "collect",
      toolName: "mcp__codeg-mcp__get_question_answer",
      input: JSON.stringify({ question_id: "q-1" }),
      state: "output-available",
      output: ANSWER,
    }
    const [folded] = foldCollectCalls([ask, collect]) as AdaptedToolCallPart[]
    renderWithIntl(
      <AskQuestionResultCard
        input={folded!.input}
        output={folded!.output}
        state={folded!.state}
      />
    )
    expect(screen.queryByText(result.awaiting)).toBeNull()
    fireEvent.click(screen.getByTestId("ask-question-result-card"))
    expect(screen.getByRole("radio", { name: /Rewrite/ })).toBeChecked()
  })
})

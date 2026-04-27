import { expect, test } from "@playwright/test"
import {
  parseBulkEditResult,
  prepareBulkEditInput,
} from "../apps/web/app/share/[shareId]/schema"
import { validateBulkEditAssignments } from "../convex/sharing"

function buildInput() {
  return prepareBulkEditInput({
    instructions: "Bob had the laksa, Alice had both teas.",
    participants: [
      { id: "participant-bob", name: "Bob" },
      { id: "participant-alice", name: "Alice" },
    ],
    lineItems: [
      {
        id: "line-item-laksa",
        name: "Laksa",
        quantity: 1,
        unitPrice: 18,
      },
      {
        id: "line-item-tea",
        name: "Iced tea",
        quantity: 2,
        unitPrice: 4,
      },
    ],
  })
}

test("prepareBulkEditInput rejects duplicate participant names", () => {
  expect(() =>
    prepareBulkEditInput({
      instructions: "Split the bill.",
      participants: [
        { id: "participant-1", name: "Alice" },
        { id: "participant-2", name: "alice" },
      ],
      lineItems: [
        {
          id: "line-item-1",
          name: "Laksa",
          quantity: 1,
          unitPrice: 18,
        },
      ],
    })
  ).toThrow("Bulk edit requires unique participant names")
})

test("parseBulkEditResult returns a fully validated review payload", () => {
  const result = parseBulkEditResult(
    buildInput(),
    JSON.stringify({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          unitIndex: 0,
          participantName: "Bob",
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 0,
          participantName: "Alice",
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 1,
          participantName: "Alice",
        },
      ],
    })
  )

  expect(result.assignments).toEqual([
    {
      lineItemId: "line-item-laksa",
      lineItemName: "Laksa",
      participantId: "participant-bob",
      participantName: "Bob",
      unitIndex: 0,
      unitPrice: 18,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantId: "participant-alice",
      participantName: "Alice",
      unitIndex: 0,
      unitPrice: 4,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantId: "participant-alice",
      participantName: "Alice",
      unitIndex: 1,
      unitPrice: 4,
    },
  ])
})

test("parseBulkEditResult rejects invalid JSON", () => {
  expect(() => parseBulkEditResult(buildInput(), "not json")).toThrow(
    "Bulk edit model returned invalid JSON"
  )
})

test("parseBulkEditResult rejects unknown participants", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Charlie",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 1,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model referenced an unknown participant: Charlie")
})

test("parseBulkEditResult rejects missing units", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Bob",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model omitted a unit: Iced tea #2")
})

test("parseBulkEditResult rejects repeated units", () => {
  expect(() =>
    parseBulkEditResult(
      buildInput(),
      JSON.stringify({
        assignments: [
          {
            lineItemId: "line-item-laksa",
            unitIndex: 0,
            participantName: "Bob",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
          {
            lineItemId: "line-item-tea",
            unitIndex: 0,
            participantName: "Alice",
          },
        ],
      })
    )
  ).toThrow("Bulk edit model repeated a unit: line-item-tea:0")
})

test("validateBulkEditAssignments rejects foreign ids before claims change", () => {
  expect(() =>
    validateBulkEditAssignments({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          participantId: "participant-bob",
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantId: "participant-alice",
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-foreign",
          participantId: "participant-alice",
          unitIndex: 0,
        },
      ],
      lineItems: [
        { id: "line-item-laksa", quantity: 1 },
        { id: "line-item-tea", quantity: 2 },
      ],
      participantIds: ["participant-bob", "participant-alice"],
    })
  ).toThrow("Bulk edit referenced an unknown unit: line-item-foreign:0")

  expect(() =>
    validateBulkEditAssignments({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          participantId: "participant-bob",
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantId: "participant-alice",
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantId: "participant-foreign",
          unitIndex: 1,
        },
      ],
      lineItems: [
        { id: "line-item-laksa", quantity: 1 },
        { id: "line-item-tea", quantity: 2 },
      ],
      participantIds: ["participant-bob", "participant-alice"],
    })
  ).toThrow("Bulk edit referenced an unknown participant")
})

import { expect, test } from "@playwright/test"
import {
  buildDeterministicBulkEditResult,
  parseBulkEditResult,
  prepareBulkEditInput,
} from "../apps/web/app/share/[shareId]/schema"
import { validateBulkEditAssignments } from "../convex/sharing"

function buildInput(instructions: string) {
  return prepareBulkEditInput({
    instructions,
    participants: [
      { id: "participant-bob", name: "Bob" },
      { id: "participant-alice", name: "Alice" },
      { id: "participant-charlie", name: "Charlie" },
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
      {
        id: "line-item-rice",
        name: "Fried rice",
        quantity: 1,
        unitPrice: 12,
      },
    ],
    currentAssignments: [
      {
        lineItemId: "line-item-laksa",
        unitIndex: 0,
        participantNames: ["Bob"],
      },
      {
        lineItemId: "line-item-tea",
        unitIndex: 0,
        participantNames: ["Alice"],
      },
      {
        lineItemId: "line-item-tea",
        unitIndex: 1,
        participantNames: ["Charlie"],
      },
      {
        lineItemId: "line-item-rice",
        unitIndex: 0,
        participantNames: ["Bob", "Charlie"],
      },
    ],
  })
}

function getAssignmentParticipantNames(
  instructions: string,
  lineItemId: string,
  unitIndex: number
) {
  const result = buildDeterministicBulkEditResult(buildInput(instructions))
  const assignment = result?.assignments.find(
    (entry) => entry.lineItemId === lineItemId && entry.unitIndex === unitIndex
  )
  return assignment?.participantNames ?? null
}

test("split all the food equally keeps drinks as-is and shares food across everyone", () => {
  expect(
    getAssignmentParticipantNames(
      "split all the food equally",
      "line-item-laksa",
      0
    )
  ).toEqual(["Bob", "Alice", "Charlie"])
  expect(
    getAssignmentParticipantNames(
      "split all the food equally",
      "line-item-rice",
      0
    )
  ).toEqual(["Bob", "Alice", "Charlie"])
  expect(
    getAssignmentParticipantNames(
      "split all the food equally",
      "line-item-tea",
      0
    )
  ).toEqual(["Alice"])
  expect(
    getAssignmentParticipantNames(
      "split all the food equally",
      "line-item-tea",
      1
    )
  ).toEqual(["Charlie"])
})

test("split all the food equally accepts simple punctuation and casing variants", () => {
  expect(
    getAssignmentParticipantNames(
      "Split all the food equally.",
      "line-item-laksa",
      0
    )
  ).toEqual(["Bob", "Alice", "Charlie"])
})

test("split all the food and drinks equally shares every unit across everyone", () => {
  const result = buildDeterministicBulkEditResult(
    buildInput("Split all the food and drinks equally")
  )

  expect(result).not.toBeNull()
  expect(result?.assignments).toHaveLength(4)
  expect(
    result?.assignments.every(
      (assignment) =>
        assignment.participantNames.join(",") === "Bob,Alice,Charlie"
    )
  ).toBe(true)
})

test("split all the drinks equally keeps food as-is and shares drinks across everyone", () => {
  expect(
    getAssignmentParticipantNames(
      "split all the drinks equally",
      "line-item-laksa",
      0
    )
  ).toEqual(["Bob"])
  expect(
    getAssignmentParticipantNames(
      "split all the drinks equally",
      "line-item-rice",
      0
    )
  ).toEqual(["Bob", "Charlie"])
  expect(
    getAssignmentParticipantNames(
      "split all the drinks equally",
      "line-item-tea",
      0
    )
  ).toEqual(["Bob", "Alice", "Charlie"])
})

test("split all the drinks equally does not treat iced cake as a drink", () => {
  const result = buildDeterministicBulkEditResult(
    prepareBulkEditInput({
      instructions: "split all the drinks equally",
      participants: [
        { id: "participant-bob", name: "Bob" },
        { id: "participant-alice", name: "Alice" },
      ],
      lineItems: [
        {
          id: "line-item-cake",
          name: "Iced cake",
          quantity: 1,
          unitPrice: 8,
        },
        {
          id: "line-item-tea",
          name: "Iced tea",
          quantity: 1,
          unitPrice: 4,
        },
      ],
      currentAssignments: [
        {
          lineItemId: "line-item-cake",
          unitIndex: 0,
          participantNames: ["Bob"],
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 0,
          participantNames: ["Alice"],
        },
      ],
    })
  )

  expect(result).not.toBeNull()
  expect(
    result?.assignments.find(
      (assignment) => assignment.lineItemId === "line-item-cake"
    )?.participantNames
  ).toEqual(["Bob"])
  expect(
    result?.assignments.find(
      (assignment) => assignment.lineItemId === "line-item-tea"
    )?.participantNames
  ).toEqual(["Bob", "Alice"])
})

test("remove all clears every unit", () => {
  const result = buildDeterministicBulkEditResult(buildInput("remove all"))

  expect(result).not.toBeNull()
  expect(
    result?.assignments.every(
      (assignment) => assignment.participantNames.length === 0
    )
  ).toBe(true)
})

test("clear all claims also clears every unit", () => {
  const result = buildDeterministicBulkEditResult(
    buildInput("clear all claims")
  )

  expect(result).not.toBeNull()
  expect(
    result?.assignments.every(
      (assignment) => assignment.participantNames.length === 0
    )
  ).toBe(true)
})

test("parseBulkEditResult accepts shared units and unassigned units", () => {
  const result = parseBulkEditResult(
    buildInput("Split the bill."),
    JSON.stringify({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          unitIndex: 0,
          participantNames: ["Bob", "Alice"],
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 0,
          participantNames: [],
        },
        {
          lineItemId: "line-item-tea",
          unitIndex: 1,
          participantName: "Charlie",
        },
        {
          lineItemId: "line-item-rice",
          unitIndex: 0,
          participantNames: ["Bob", "Charlie"],
        },
      ],
    })
  )

  expect(result.assignments).toEqual([
    {
      lineItemId: "line-item-laksa",
      lineItemName: "Laksa",
      participantIds: ["participant-bob", "participant-alice"],
      participantNames: ["Bob", "Alice"],
      unitIndex: 0,
      unitPrice: 18,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantIds: [],
      participantNames: [],
      unitIndex: 0,
      unitPrice: 4,
    },
    {
      lineItemId: "line-item-tea",
      lineItemName: "Iced tea",
      participantIds: ["participant-charlie"],
      participantNames: ["Charlie"],
      unitIndex: 1,
      unitPrice: 4,
    },
    {
      lineItemId: "line-item-rice",
      lineItemName: "Fried rice",
      participantIds: ["participant-bob", "participant-charlie"],
      participantNames: ["Bob", "Charlie"],
      unitIndex: 0,
      unitPrice: 12,
    },
  ])
})

test("validateBulkEditAssignments accepts shared and unassigned units", () => {
  expect(
    validateBulkEditAssignments({
      assignments: [
        {
          lineItemId: "line-item-laksa",
          participantIds: ["participant-bob", "participant-alice"],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantIds: [],
          unitIndex: 0,
        },
        {
          lineItemId: "line-item-tea",
          participantIds: ["participant-charlie"],
          unitIndex: 1,
        },
        {
          lineItemId: "line-item-rice",
          participantIds: ["participant-bob", "participant-charlie"],
          unitIndex: 0,
        },
      ],
      lineItems: [
        { id: "line-item-laksa", quantity: 1 },
        { id: "line-item-tea", quantity: 2 },
        { id: "line-item-rice", quantity: 1 },
      ],
      participantIds: [
        "participant-bob",
        "participant-alice",
        "participant-charlie",
      ],
    })
  ).toEqual([
    {
      lineItemId: "line-item-laksa",
      participantIds: ["participant-bob", "participant-alice"],
      unitIndex: 0,
    },
    {
      lineItemId: "line-item-tea",
      participantIds: [],
      unitIndex: 0,
    },
    {
      lineItemId: "line-item-tea",
      participantIds: ["participant-charlie"],
      unitIndex: 1,
    },
    {
      lineItemId: "line-item-rice",
      participantIds: ["participant-bob", "participant-charlie"],
      unitIndex: 0,
    },
  ])
})

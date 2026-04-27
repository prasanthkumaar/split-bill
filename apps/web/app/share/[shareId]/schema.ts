import { z } from "zod"

const bulkEditParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
})

const bulkEditLineItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
})

export const bulkEditInputSchema = z.object({
  instructions: z.string().trim().min(1),
  participants: z.array(bulkEditParticipantSchema).min(1),
  lineItems: z.array(bulkEditLineItemSchema).min(1),
})

const bulkEditModelAssignmentSchema = z.object({
  lineItemId: z.string().min(1),
  unitIndex: z.number().int().nonnegative(),
  participantName: z.string().trim().min(1),
})

const bulkEditModelResultSchema = z.object({
  assignments: z.array(bulkEditModelAssignmentSchema),
})

export const bulkEditResultSchema = z.object({
  assignments: z.array(
    z.object({
      lineItemId: z.string().min(1),
      lineItemName: z.string().trim().min(1),
      unitIndex: z.number().int().nonnegative(),
      unitPrice: z.number().nonnegative(),
      participantId: z.string().min(1),
      participantName: z.string().trim().min(1),
    })
  ),
})

export type BulkEditInput = z.infer<typeof bulkEditInputSchema>
export type PreparedBulkEditInput = z.infer<typeof bulkEditInputSchema>
export type BulkEditResult = z.infer<typeof bulkEditResultSchema>

export function prepareBulkEditInput(input: BulkEditInput) {
  const parsedInput = bulkEditInputSchema.parse(input)
  assertUniqueParticipantNames(parsedInput.participants)
  return parsedInput
}

export function parseBulkEditResult(
  input: PreparedBulkEditInput,
  rawResultText: string
) {
  const parsedJson = parseBulkEditJson(rawResultText)
  const modelResult = bulkEditModelResultSchema.parse(parsedJson)
  const participantIdByName = new Map(
    input.participants.map((participant) => [
      normaliseParticipantName(participant.name),
      participant.id,
    ])
  )
  const requiredUnits = input.lineItems.flatMap((lineItem) =>
    Array.from({ length: lineItem.quantity }, (_, unitIndex) => ({
      key: getUnitKey(lineItem.id, unitIndex),
      lineItemId: lineItem.id,
      lineItemName: lineItem.name,
      unitIndex,
      unitPrice: lineItem.unitPrice,
    }))
  )
  const requiredUnitByKey = new Map(
    requiredUnits.map((unit) => [unit.key, unit])
  )
  const assignmentByKey = new Map<
    string,
    {
      lineItemId: string
      lineItemName: string
      participantId: string
      participantName: string
      unitIndex: number
      unitPrice: number
    }
  >()

  for (const assignment of modelResult.assignments) {
    const unitKey = getUnitKey(assignment.lineItemId, assignment.unitIndex)
    const unit = requiredUnitByKey.get(unitKey)
    if (!unit) {
      throw new Error(
        `Bulk edit model referenced an unknown unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    if (assignmentByKey.has(unitKey)) {
      throw new Error(
        `Bulk edit model repeated a unit: ${assignment.lineItemId}:${assignment.unitIndex}`
      )
    }

    const participantId = participantIdByName.get(
      normaliseParticipantName(assignment.participantName)
    )
    if (!participantId) {
      throw new Error(
        `Bulk edit model referenced an unknown participant: ${assignment.participantName}`
      )
    }

    assignmentByKey.set(unitKey, {
      lineItemId: unit.lineItemId,
      lineItemName: unit.lineItemName,
      participantId,
      participantName: assignment.participantName,
      unitIndex: unit.unitIndex,
      unitPrice: unit.unitPrice,
    })
  }

  for (const unit of requiredUnits) {
    if (!assignmentByKey.has(unit.key)) {
      throw new Error(
        `Bulk edit model omitted a unit: ${unit.lineItemName} #${unit.unitIndex + 1}`
      )
    }
  }

  return bulkEditResultSchema.parse({
    assignments: requiredUnits.map((unit) => assignmentByKey.get(unit.key)!),
  })
}

function assertUniqueParticipantNames(
  participants: PreparedBulkEditInput["participants"]
) {
  const seenNames = new Set<string>()

  for (const participant of participants) {
    const key = normaliseParticipantName(participant.name)
    if (seenNames.has(key)) {
      throw new Error("Bulk edit requires unique participant names")
    }

    seenNames.add(key)
  }
}

function parseBulkEditJson(rawResultText: string) {
  try {
    return JSON.parse(rawResultText)
  } catch {
    throw new Error("Bulk edit model returned invalid JSON")
  }
}

function normaliseParticipantName(name: string) {
  return name.trim().toLocaleLowerCase()
}

function getUnitKey(lineItemId: string, unitIndex: number) {
  return `${lineItemId}:${unitIndex}`
}

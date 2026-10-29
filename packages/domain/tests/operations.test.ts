import { describe, expect, it } from "vitest";
import {
  customExercisePayloadSchema,
  profileUpdatePayloadSchema,
  restUpdatePayloadSchema,
} from "../src/validacao/index.ts";

const exercise = {
  name: "Exercício fictício",
  primary_muscles: ["quadriceps"],
  secondary_muscles: ["glutes"],
  equipment: ["dumbbell"],
  difficulty: "beginner",
  measure_type: "reps",
  movement_pattern: "lunge",
  instructions: ["Primeiro passo."],
  safety_tips: [],
};

describe("customExercisePayloadSchema (API-020)", () => {
  it("aceita exercício completo", () => {
    expect(customExercisePayloadSchema.safeParse(exercise).success).toBe(true);
  });

  it("recusa grupo repetido, sem primário, listas repetidas e campos extras", () => {
    const invalid = [
      { ...exercise, secondary_muscles: ["quadriceps"] },
      { ...exercise, primary_muscles: [] },
      { ...exercise, equipment: ["dumbbell", "dumbbell"] },
      { ...exercise, instructions: [] },
      { ...exercise, origin: "imported" },
    ];
    for (const payload of invalid) {
      expect(customExercisePayloadSchema.safeParse(payload).success).toBe(false);
    }
  });
});

describe("profileUpdatePayloadSchema e restUpdatePayloadSchema", () => {
  it("perfil exige algo a alterar", () => {
    expect(profileUpdatePayloadSchema.safeParse({}).success).toBe(false);
    expect(profileUpdatePayloadSchema.safeParse({ profile: { goal: "strength" } }).success).toBe(
      true,
    );
  });

  it("descanso recusa grupo repetido e fora da faixa", () => {
    const override = { muscle_group_code: "chest", hours: 48 };
    expect(
      restUpdatePayloadSchema.safeParse({ default_hours: 48, overrides: [override, override] })
        .success,
    ).toBe(false);
    expect(restUpdatePayloadSchema.safeParse({ default_hours: 200, overrides: [] }).success).toBe(
      false,
    );
    expect(
      restUpdatePayloadSchema.safeParse({ default_hours: 48, overrides: [override] }).success,
    ).toBe(true);
  });
});

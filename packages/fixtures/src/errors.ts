export const REJECTION_REASONS = [
  "traversal",
  "absolute",
  "symlink-escape",
  "not-found",
] as const;

export type RejectionReason = (typeof REJECTION_REASONS)[number];

export type FixtureError =
  | { readonly code: "UNKNOWN_FIXTURE"; readonly id: string }
  | {
      readonly code: "PATH_REJECTED";
      readonly path: string;
      readonly reason: RejectionReason;
    };

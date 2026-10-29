import { TEACHER_CARD } from "./teacher-shell";

/** Props of {@link ClassChallengesNotice}. */
export interface ClassChallengesNoticeProps {
  /** The translated explanation for an account that owns no class. */
  message: string;
}

/**
 * Explains to a signed-in account that class challenges belong to one teacher.
 * The teacher screens show this notice instead of the panel or the form when
 * the account owns no class.
 * @param props The translated explanation.
 * @returns The notice card.
 */
export function ClassChallengesNotice({ message }: ClassChallengesNoticeProps) {
  return (
    <div className={TEACHER_CARD} role="status">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

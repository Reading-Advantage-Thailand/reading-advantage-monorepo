import { useTranslations } from "next-intl";
import type { StoryCharacter } from "@reading-advantage/domain/stories";

/**
 * The characters of the story bible: a name, a short description, and a background line.
 * @param props.characters The characters of the story.
 * @returns The character cards, or a note when the story has none.
 */
export function StoryCharacters({ characters }: { characters: StoryCharacter[] }) {
  const t = useTranslations("Stories");
  if (!characters.length) return <p>{t("noCharacters")}</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {characters.map((character, index) => (
        <li key={`${character.name}-${index}`} className="flex flex-col gap-1 rounded-md border-2 border-[#8a6a3b] bg-[#fff4dc]/70 p-3 text-[#2a2117]">
          <b className="text-lg">{character.name}</b>
          {character.description ? <p>{character.description}</p> : null}
          {character.background ? (
            <p className="text-sm opacity-80">
              <b>{t("background")}</b> {character.background}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

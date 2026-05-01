import React from "react";
import Link from "next/link";
import book1 from "@/public/book-1.jpg";
import book1Optimized from "@/public/book1-original.jpg";
import { title } from "process";

const Book = ({
  title,
  summary,
  level,
  cefr,
  src,
  id,
  passage,
}: {
  title: string;
  summary: string;
  level: number;
  cefr: string;
  src: string;
  id: string;
  // <p>
  passage: string;
}) => {
  return (
    <div className="card rotate-1">
      <div className="imgBox">
        <div className="bark"></div>
        <img src={book1.src} alt="book" />
      </div>
      <div className="details flex flex-col gap-1">
        <h2 className="text-gray-200 font-bold text-[10px]">{title}</h2>
        <div className="flex gap-1">
          <div className="bg-white px-[3px] py-[1px] text-[6px] rounded-sm">
            Reading Advantage level is {level}
          </div>
          <div className="bg-white px-[3px] py-[1px] text-[6px] rounded-sm">
            CEFR level is {cefr}
          </div>
        </div>
        <h3 className="text-gray-400 text-[8px]">{summary}</h3>
        <img className="rounded-sm" src={src} alt="book" />
        <div className="flex gap-1 text-white ">
          <p className="text-[8px]">Voice Assistant</p>
          <div className="bg-slate-700 px-[3px] py-[1px] text-[6px] rounded-sm hover:scale-105 transition-transform duration-300 ease-in-out">
            Play sound
          </div>
          <div className="bg-slate-700 px-[3px] py-[1px] text-[6px] rounded-sm hover:scale-105 transition-transform duration-300 ease-in-out">
            Translate
          </div>
        </div>
        <p className="text-gray-400 text-[8px]">{passage}</p>
        {/* <p className="text-gray-400 text-[8px]">
          The old mansion stood at the edge of the town, shrouded in an aura of
          mystery and neglect. Its once-grand facade was now a tapestry of
          peeling paint and ivy tendrils, whispering secrets of a bygone era.
          For years, it had been the subject of local lore, a place where
          shadows danced and whispers lingered.{" "}
          <span className="rounded-sm px-1 bg-red-700 text-white">
            But for attorney Evelyn Harper,
          </span>{" "}
          it was the key to unraveling a case that had haunted her for years...
        </p> */}
        <div className="flex">
          <p className="bg-green-700 px-[3px] py-[1px] text-[7px] rounded-sm text-white hover:scale-110 transition-transform duration-300 ease-in-out">
            <Link href={`/student/read/${id}`}>Read More...</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Book;

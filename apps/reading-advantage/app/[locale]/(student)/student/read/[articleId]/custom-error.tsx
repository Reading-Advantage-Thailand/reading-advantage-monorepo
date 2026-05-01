import Image from "next/image";

export default function Error({
  message,
  resp,
}: {
  message: string;
  resp: any;
}) {
  return (
    <div className="mt-20 flex flex-col items-center justify-center h-full space-y-4">
      <Image
        src={"/man-mage-light.svg"}
        alt="man-mage"
        width={92 * 2}
        height={115 * 2}
      />
      <h2 className="text-2xl font-bold text-center text-red-600 dark:text-red-400">
        Something went wrong while processing your request
      </h2>
      <p className="text-center text-red-500 dark:text-red-300">
        Error message: {message}
        <br />
        Invalids: {JSON.stringify(resp)}
      </p>
    </div>
  );
}

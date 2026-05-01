import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line import/no-anonymous-default-export
export default (func: (req: NextRequest, context: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context: any) => {
        try {
            return await func(req, context);
        } catch (error) {
            if (error instanceof Error) {
                console.error("Internal Server Error", error);
                return NextResponse.json({ message: error.message }, { status: 500 });
            } else {
                console.error("Unknown error", error);
                return NextResponse.json({ message: 'An unknown error occurred' }, { status: 500 });
            }
        }
    };
};

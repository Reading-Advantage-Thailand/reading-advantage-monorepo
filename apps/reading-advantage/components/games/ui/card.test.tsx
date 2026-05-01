import { render, screen } from "@testing-library/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";

describe("Card", () => {
  it("renders card slots with data attributes", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText("Title")).toHaveAttribute(
      "data-slot",
      "card-title"
    );
    expect(screen.getByText("Description")).toHaveAttribute(
      "data-slot",
      "card-description"
    );
    expect(screen.getByText("Content")).toHaveAttribute(
      "data-slot",
      "card-content"
    );
    expect(screen.getByText("Footer")).toHaveAttribute(
      "data-slot",
      "card-footer"
    );
  });
});

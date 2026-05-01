import React, { CSSProperties, ReactElement } from "react";
import styled from "@emotion/styled";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type {
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot,
} from "@hello-pangea/dnd";
import type { Quote } from "./types";
import QuoteItem from "./quote-item";

export const getBackgroundColor = (
  isDraggingOver: boolean,
  isDraggingFrom: boolean
): string => {
  if (isDraggingOver) {
    return "#FFEBE6";
  }
  if (isDraggingFrom) {
    return "#E6FCFF";
  }
  return "#EBECF0";
};

interface WrapperProps {
  isDraggingOver: boolean;
  isDraggingFrom: boolean;
  isDropDisabled: boolean;
}

const Wrapper = styled.div<WrapperProps>`
  background-color: ${(props) =>
    getBackgroundColor(props.isDraggingOver, props.isDraggingFrom)};
  display: flex;
  flex-direction: column;
  opacity: ${({ isDropDisabled }) => (isDropDisabled ? 0.5 : "inherit")};
  padding: 8px;
  border: 8px;
  padding-bottom: 0;
  transition: background-color 0.2s ease, opacity 0.1s ease;
  user-select: none;
  width: 100%;
`;

const scrollContainerHeight = 250;

const DropZone = styled.div`
  /* stop the list collapsing when empty */
  min-height: ${scrollContainerHeight}px;

  /*
    not relying on the items for a margin-bottom
    as it will collapse when the list is empty
  */
  padding-bottom: 8px;
`;

const Container = styled.div``;

const Title = styled.h4`
  padding: 8px;
  transition: background-color ease 0.2s;
  flex-grow: 1;
  user-select: none;
  position: relative;

  &:focus {
    outline: 2px solid #998dd9;
    outline-offset: 2px;
  }
`;

interface Props {
  listId?: string;
  listType?: string;
  quotes: Quote[];
  title?: string;
  internalScroll?: boolean;
  scrollContainerStyle?: CSSProperties;
  isDropDisabled?: boolean;
  isCombineEnabled?: boolean;
  style?: CSSProperties;
  // may not be provided - and might be null
  ignoreContainerClipping?: boolean;
  useClone?: boolean;
  sectionIndex?: number;
  articleBeforeRandom: any
}

interface QuoteListProps {
  quotes: Quote[];
  title: string;
  sectionIndex: number;
  articleBeforeRandom: any
}

const InnerQuoteList = (props: QuoteListProps): ReactElement => {
  return (
    <>
      {props?.quotes?.map((quote: Quote, index: number) => (
        <Draggable
          key={index}
          draggableId={`item-${index}`}
          index={index}
        >
          {(
            dragProvided: DraggableProvided,
            dragSnapshot: DraggableStateSnapshot
          ) => (
            <QuoteItem
              key={index}
              quote={quote}
              isDragging={dragSnapshot.isDragging}
              isGroupedOver={Boolean(dragSnapshot.combineTargetFor)}
              provided={dragProvided}
              index={index}
              articleBeforeRandom={props.articleBeforeRandom}
            />
          )}
        </Draggable>
      ))}
    </>
  );
};

const InnerQuoteListMemo = React.memo<QuoteListProps>(InnerQuoteList);

interface InnerListProps {
  dropProvided: DroppableProvided;
  quotes: Quote[];
  title: string | undefined | null;
  sectionIndex: number;
  articleBeforeRandom: any
}

const InnerList = (props: InnerListProps) => {
  const { quotes, dropProvided, sectionIndex, articleBeforeRandom } = props;
  const title = props.title ?? "";

  return (
    <Container>
      <DropZone ref={dropProvided.innerRef}>
        <InnerQuoteListMemo
          quotes={quotes}
          title={title}
          sectionIndex={sectionIndex}
          articleBeforeRandom={articleBeforeRandom}
        />
        {dropProvided.placeholder}
      </DropZone>
    </Container>
  );
};

export default function QuoteList(props: Props): ReactElement {
  const {
    ignoreContainerClipping,
    isDropDisabled,
    isCombineEnabled,
    listType,
    style,
    quotes,
    title,
    sectionIndex,
    articleBeforeRandom,
  } = props;

  return (
    <Droppable
      droppableId={`droppable-${sectionIndex}`}
      // type={listType}
      ignoreContainerClipping={ignoreContainerClipping}
      isDropDisabled={isDropDisabled}
      isCombineEnabled={isCombineEnabled}
    >
      {(
        dropProvided: DroppableProvided,
        dropSnapshot: DroppableStateSnapshot
      ) => (
        <Wrapper
          style={style}
          isDraggingOver={dropSnapshot.isDraggingOver}
          isDropDisabled={Boolean(isDropDisabled)}
          isDraggingFrom={Boolean(dropSnapshot.draggingFromThisWith)}
          {...dropProvided.droppableProps}
        >
          <InnerList
            quotes={quotes}
            title={title}
            dropProvided={dropProvided}
            sectionIndex={sectionIndex as number}
            articleBeforeRandom={articleBeforeRandom}
          />
        </Wrapper>
      )}
    </Droppable>
  );
}

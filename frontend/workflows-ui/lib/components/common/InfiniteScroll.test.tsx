import { render, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { vi } from "vitest";
import InfiniteScroll from "./InfiniteScroll";

describe("InfiniteScroll", () => {
  let intersectionCallback: IntersectionObserverCallback;
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    observe = vi.fn();
    disconnect = vi.fn();

    class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
    }

    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const triggerIntersection = (isIntersecting: boolean) => {
    act(() => {
      intersectionCallback(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });
  };

  it("renders its children", () => {
    render(
      <InfiniteScroll hasMore={false} loading={false} onLoadMore={vi.fn()}>
        <div>Template list</div>
      </InfiniteScroll>,
    );

    expect(screen.getByText("Template list")).toBeInTheDocument();
  });

  it("requests another page when the bottom becomes visible", () => {
    const onLoadMore = vi.fn();

    render(
      <InfiniteScroll hasMore loading={false} onLoadMore={onLoadMore}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    triggerIntersection(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not request more when the bottom is not visible", () => {
    const onLoadMore = vi.fn();

    render(
      <InfiniteScroll hasMore loading={false} onLoadMore={onLoadMore}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    triggerIntersection(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not observe when there are no more pages", () => {
    render(
      <InfiniteScroll hasMore={false} loading={false} onLoadMore={vi.fn()}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    expect(observe).not.toHaveBeenCalled();
  });

  it("displays a loading indicator", () => {
    render(
      <InfiniteScroll hasMore loading onLoadMore={vi.fn()}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("does not observe while loading", () => {
    render(
      <InfiniteScroll hasMore loading onLoadMore={vi.fn()}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    expect(observe).not.toHaveBeenCalled();
  });

  it("disconnects the observer when unmounted", () => {
    const { unmount } = render(
      <InfiniteScroll hasMore loading={false} onLoadMore={vi.fn()}>
        <div>Templates</div>
      </InfiniteScroll>,
    );

    unmount();

    expect(disconnect).toHaveBeenCalled();
  });
});

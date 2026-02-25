import type { CssInJs } from "../plugin-types.ts";

export function carouselComponents(): Record<string, CssInJs> {
  return {
    ".carousel": {
      display: "flex",
      overflowX: "scroll",
      scrollSnapType: "x mandatory",
      scrollBehavior: "smooth",
      scrollbarWidth: "none",
      "&::-webkit-scrollbar": {
        display: "none",
      },
    },
    ".carousel-item": {
      flex: "0 0 100%",
      scrollSnapAlign: "start",
    },
    ".carousel-center .carousel-item": {
      scrollSnapAlign: "center",
    },
    ".carousel-end .carousel-item": {
      scrollSnapAlign: "end",
    },
    ".carousel-vertical": {
      flexDirection: "column",
      overflowX: "hidden",
      overflowY: "scroll",
    },
    ".carousel-full-width": {
      "& .carousel-item": {
        flex: "0 0 100vw",
      },
    },
  };
}

import React from "react";
import { createRoot, type Root } from "react-dom/client";
import TimelineDemo from "@/components/ui/demo";
import "./tailwind.css";
import "../styles.css";

declare global {
  interface Window {
    React: typeof React;
    ReactDOM: { render: (node: React.ReactNode, container: Element) => void };
  }
}

const roots = new WeakMap<Element, Root>();
const legacyRender = (node: React.ReactNode, container: Element) => {
  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(node);
};

const legacyGlobals = window as unknown as {
  React: typeof React;
  ReactDOM: { render: (node: React.ReactNode, container: Element) => void };
};
legacyGlobals.React = React;
legacyGlobals.ReactDOM = { render: legacyRender };

void import("./legacy-app.js").then(() => {
  const mount = document.getElementById("timeline-root");
  if (!mount) return;
  createRoot(mount).render(<TimelineDemo />);
});

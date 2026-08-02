"use client";

import { useEffect, useRef } from "react";

/**
 * Submits the enclosing GET form whenever a control changes, so filtering feels
 * immediate without moving filter state into React. The explicit submit button
 * beside it stays visible as the no-JS path.
 */
export function FilterAutoSubmit() {
  const anchor = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const form = anchor.current?.closest("form");
    if (!form) return;

    const onChange = () => form.requestSubmit();
    form.addEventListener("change", onChange);
    return () => form.removeEventListener("change", onChange);
  }, []);

  return <span ref={anchor} hidden />;
}

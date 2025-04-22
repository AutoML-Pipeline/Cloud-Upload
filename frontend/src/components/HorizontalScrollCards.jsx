import React, { useRef, useEffect } from "react";
import { gsap } from "gsap";

export default function HorizontalScrollCards({ children }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let isDown = false;
    let startX;
    let scrollLeft;

    const onMouseDown = (e) => {
      isDown = true;
      el.classList.add("scrolling");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onMouseLeave = () => {
      isDown = false;
      el.classList.remove("scrolling");
    };
    const onMouseUp = () => {
      isDown = false;
      el.classList.remove("scrolling");
    };
    const onMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX) * 1.5;
      gsap.to(el, { scrollLeft: scrollLeft - walk, duration: 0.4, ease: "power2.out" });
    };
    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("mouseleave", onMouseLeave);
    el.addEventListener("mouseup", onMouseUp);
    el.addEventListener("mousemove", onMouseMove);
    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("mouseleave", onMouseLeave);
      el.removeEventListener("mouseup", onMouseUp);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: 32,
        overflowX: "auto",
        scrollBehavior: "smooth",
        paddingBottom: 8,
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "thin",
        scrollbarColor: "#6366f1 #232b38",
        cursor: "grab",
      }}
      className="horizontal-scroll-cards"
    >
      {children}
    </div>
  );
}

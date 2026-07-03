"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function ProfileMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) return;

      gsap.utils.toArray<HTMLElement>("[data-profile-image]").forEach((image) => {
        gsap.fromTo(
          image,
          { opacity: 0.22, scale: 0.86 },
          {
            opacity: 1,
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: image,
              start: "top 92%",
              end: "bottom 18%",
              scrub: 0.6,
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-stack-card]").forEach((card, index) => {
        gsap.fromTo(
          card,
          { y: 48 + index * 10, opacity: 0.24, scale: 0.94 },
          {
            y: 0,
            opacity: 1,
            scale: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              end: "top 44%",
              scrub: true,
            },
          }
        );
      });
    },
    { scope: root }
  );

  return <div ref={root}>{children}</div>;
}

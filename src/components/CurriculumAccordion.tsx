"use client";

import { useState } from "react";
import type { CourseSection } from "@/lib/courses";

export function CurriculumAccordion({
  curriculum,
}: {
  curriculum: CourseSection[];
}) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="curriculum-accordion">
      {curriculum.map((section, idx) => {
        const isOpen = openIndex === idx;
        const totalMin = section.lessons.reduce((sum, l) => {
          const [m, s] = l.duration.split(":").map(Number);
          return sum + m + (s || 0) / 60;
        }, 0);
        return (
          <div
            className={`accordion-section ${isOpen ? "open" : ""}`}
            key={idx}
          >
            <button
              className="accordion-header"
              onClick={() => setOpenIndex(isOpen ? -1 : idx)}
            >
              <div className="accordion-title">
                <i
                  className={`fas ${
                    isOpen ? "fa-chevron-down" : "fa-chevron-right"
                  }`}
                ></i>
                <strong>
                  Sección {idx + 1}: {section.title}
                </strong>
              </div>
              <span className="accordion-meta">
                {section.lessons.length} lecciones • {Math.round(totalMin)}m
              </span>
            </button>
            <div className={`accordion-body ${isOpen ? "" : "hidden"}`}>
              {section.lessons.map((lesson, i) => (
                <div className="lesson-item" key={i}>
                  <div className="lesson-info">
                    <i
                      className={`fas ${
                        lesson.type === "exercise"
                          ? "fa-file-alt"
                          : "fa-play-circle"
                      }`}
                    ></i>
                    <span>{lesson.title}</span>
                  </div>
                  <span className="lesson-duration">{lesson.duration}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

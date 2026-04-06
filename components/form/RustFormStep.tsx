/**
 * RustFormStep — Individual step within a multi-step RustForm.
 *
 * Wraps step content and exposes it to RustFormSteps via context.
 * Handles showing/hiding based on the active step index.
 *
 * @example
 * ```tsx
 * <RustFormStep index={0} title="Personal Info">
 *   <RustFormField name="email" label="Email" type="email" />
 *   <RustFormField name="name" label="Name" />
 * </RustFormStep>
 * ```
 */

import React, { forwardRef } from 'react';

export interface RustFormStepProps {
  /** Zero-based step index (must match position in RustFormSteps children order) */
  index: number;
  /** Human-readable step title for progress indicator */
  title: string;
  /** Content rendered when this step is active */
  children: React.ReactNode;
  /** Optional additional class name for the step container */
  className?: string;
}

export const RustFormStep = forwardRef<HTMLDivElement, RustFormStepProps>(
  function RustFormStep(
    { index, title, children, className },
    ref,
  ) {
    // This component is a declarative placeholder.
    // RustFormSteps reads `index` and `title` from its children props
    // to build the step state machine. The actual show/hide logic
    // lives in the parent, so this component always renders its children
    // when mounted by the parent's conditional rendering.

    return (
      <div
        ref={ref}
        role="group"
        aria-label={`Step ${index + 1}: ${title}`}
        className={className ?? 'space-y-4'}
      >
        {children}
      </div>
    );
  },
);

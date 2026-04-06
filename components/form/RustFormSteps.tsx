/**
 * RustFormSteps — Multi-step form wrapper with progress bar and step validation.
 *
 * Wraps `<RustFormStep>` children and manages:
 * - Current step state machine (forward, back, goTo)
 * - Per-step validation before advancing
 * - Animated progress indicator
 * - Previous / Next / Submit button orchestration
 *
 * @example
 * ```tsx
 * <RustFormSteps
 *   submitText="Complete Registration"
 *   onFinish={handleFinish}
 * >
 *   <RustFormStep index={0} title="Account">
 *     <RustFormField name="email" label="Email" type="email" />
 *     <RustFormField name="password" label="Password" type="password" />
 *   </RustFormStep>
 *
 *   <RustFormStep index={1} title="Profile">
 *     <RustFormField name="name" label="Full Name" />
 *     <RustFormField name="bio" label="Bio" type="textarea" />
 *   </RustFormStep>
 *
 *   <RustFormStep index={2} title="Review">
 *     <ReviewSummary />
 *   </RustFormStep>
 * </RustFormSteps>
 * ```
 */

import React, {
  Children,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  createContext,
  ReactNode,
} from 'react';

import { RustFormStep, type RustFormStepProps } from './RustFormStep.js';
import { useFormContext } from './RustForm.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StepInfo {
  index: number;
  title: string;
}

export interface StepsContextValue {
  /** Current active step index */
  currentStep: number;
  /** Total number of steps */
  totalSteps: number;
  /** Whether we can go back */
  canGoBack: boolean;
  /** Whether we are on the last step */
  isLastStep: boolean;
  /** Step metadata */
  steps: StepInfo[];
  /** Go to the next step (validates first) */
  goNext: () => void;
  /** Go to the previous step */
  goBack: () => void;
  /** Jump to a specific step (validates current first) */
  goTo: (index: number) => void;
  /** Whether a given step has been validated (visited and passed) */
  isStepValidated: (index: number) => boolean;
}

export interface RustFormStepsProps {
  /** Text for the final submit button */
  submitText?: string;
  /** Text for the "Next" button */
  nextText?: string;
  /** Text for the "Previous" button */
  prevText?: string;
  /** Called when the final step's submit button is pressed */
  onFinish?: () => void | Promise<void>;
  /** Optional wrapper class */
  className?: string;
  /** Children must be `<RustFormStep>` elements */
  children: ReactNode;
  /** Show numbered step indicators */
  showStepNumbers?: boolean;
  /** Show step titles in the progress bar */
  showStepTitles?: boolean;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const StepsContext = createContext<StepsContextValue | null>(null);

export function useStepsContext(): StepsContextValue {
  const ctx = useContext(StepsContext);
  if (!ctx) {
    throw new Error('useStepsContext must be used within RustFormSteps');
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cn(...classes: Array<string | undefined | false | null>): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Extract step metadata from children. Only picks up `<RustFormStep>` elements.
 */
function extractSteps(children: ReactNode): StepInfo[] {
  const steps: StepInfo[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child)) {
      const props = child.props as Partial<RustFormStepProps>;
      if (child.type === RustFormStep || typeof child.type === 'function') {
        if (typeof props.index === 'number' && typeof props.title === 'string') {
          steps.push({ index: props.index, title: props.title });
        }
      }
    }
  });

  // Sort by index to guarantee order
  steps.sort((a, b) => a.index - b.index);
  return steps;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RustFormSteps({
  submitText = 'Submit',
  nextText = 'Next',
  prevText = 'Previous',
  onFinish,
  className,
  children,
  showStepNumbers = true,
  showStepTitles = true,
}: RustFormStepsProps) {
  const { validateField, errors, touched } = useFormContext();

  const steps = useMemo(() => extractSteps(children), [children]);
  const totalSteps = steps.length;

  if (totalSteps === 0) {
    throw new Error(
      'RustFormSteps must have at least one <RustFormStep> child.',
    );
  }

  const [currentStep, setCurrentStep] = useState(0);
  // Track which steps have passed validation
  const [validatedSteps, setValidatedSteps] = useState<Set<number>>(new Set());

  // -----------------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------------

  /**
   * Validate all *touched* fields belonging to the current step.
   * Returns true when there are no errors for this step's fields.
   *
   * We determine "step fields" by checking which fields have been touched
   * since the step was activated. A simpler heuristic: a step is valid
   * if the global errors object has no entries for fields that belong
   * to this step. Since we don't have an explicit field-to-step mapping,
   * we validate all currently touched fields and check for errors.
   */
  const validateCurrentStep = useCallback((): boolean => {
    // Collect all touched field names and validate them
    const touchedFields = Object.keys(touched);
    let hasErrors = false;

    for (const name of touchedFields) {
      const fieldErrors = validateField(name);
      if (fieldErrors.length > 0) {
        hasErrors = true;
      }
    }

    // Also check existing errors
    const currentErrorCount = Object.keys(errors).length;
    if (currentErrorCount > 0) {
      hasErrors = true;
    }

    if (!hasErrors) {
      setValidatedSteps((prev) => {
        const next = new Set(prev);
        next.add(currentStep);
        return next;
      });
    }

    return !hasErrors;
  }, [touched, errors, validateField, currentStep]);

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const goNext = useCallback(() => {
    if (currentStep >= totalSteps - 1) return;
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [currentStep, totalSteps, validateCurrentStep]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSteps) return;
      // Only allow jumping forward through validated steps
      if (index > currentStep) {
        // Validate current step first
        if (!validateCurrentStep()) return;
        // Ensure all intermediate steps are validated
        for (let i = currentStep + 1; i < index; i++) {
          if (!validatedSteps.has(i)) return;
        }
      }
      setCurrentStep(index);
    },
    [currentStep, totalSteps, validateCurrentStep, validatedSteps],
  );

  // -----------------------------------------------------------------------
  // Derived values
  // -----------------------------------------------------------------------

  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === totalSteps - 1;

  const isStepValidated = useCallback(
    (index: number) => validatedSteps.has(index),
    [validatedSteps],
  );

  const contextValue = useMemo<StepsContextValue>(
    () => ({
      currentStep,
      totalSteps,
      canGoBack,
      isLastStep,
      steps,
      goNext,
      goBack,
      goTo,
      isStepValidated,
    }),
    [
      currentStep,
      totalSteps,
      canGoBack,
      isLastStep,
      steps,
      goNext,
      goBack,
      goTo,
      isStepValidated,
    ],
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // Progress percentage
  const progressPercent =
    totalSteps === 1 ? 100 : ((currentStep + 1) / totalSteps) * 100;

  return (
    <StepsContext.Provider value={contextValue}>
      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={currentStep + 1}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
        className="mb-6"
      >
        {/* Step indicators row */}
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, i) => {
            const isActive = i === currentStep;
            const isComplete = i < currentStep || validatedSteps.has(i);

            return (
              <React.Fragment key={step.index}>
                {/* Step circle */}
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  disabled={i > currentStep && !validatedSteps.has(i - 1)}
                  className={cn(
                    'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
                    isComplete && 'bg-primary text-primary-foreground',
                    isActive && !isComplete && 'ring-2 ring-primary bg-transparent text-primary',
                    !isActive && !isComplete && 'bg-muted text-muted-foreground ring-1 ring-border',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${i + 1}: ${step.title}${isComplete ? ' (completed)' : ''}${isActive ? ' (current)' : ''}`}
                >
                  {isComplete ? (
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    showStepNumbers && (i + 1)
                  )}
                </button>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="h-0.5 flex-1 mx-2 bg-border overflow-hidden rounded">
                    <div
                      className={cn(
                        'h-full transition-all duration-300 ease-in-out',
                        i < currentStep ? 'bg-primary' : 'bg-transparent',
                      )}
                      style={{
                        width: i < currentStep ? '100%' : '0%',
                      }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step titles */}
        {showStepTitles && (
          <div className="flex justify-between mt-1">
            {steps.map((step, i) => (
              <span
                key={step.index}
                className={cn(
                  'text-xs truncate max-w-[100px] text-center transition-colors',
                  i === currentStep && 'text-foreground font-medium',
                  i < currentStep && 'text-muted-foreground',
                  i > currentStep && 'text-muted-foreground/50',
                )}
              >
                {step.title}
              </span>
            ))}
          </div>
        )}

        {/* Thin progress bar */}
        <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-in-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active step content */}
      <div className="min-h-[120px]">
        {Children.map(children, (child) => {
          if (isValidElement(child)) {
            const props = child.props as Partial<RustFormStepProps>;
            if (props.index === currentStep) {
              return child;
            }
          }
          return null;
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
        <button
          type="button"
          onClick={goBack}
          disabled={!canGoBack}
          className={cn(
            'px-4 py-2 rounded text-sm font-medium transition-colors',
            'text-foreground hover:bg-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary/50',
            !canGoBack && 'opacity-40 cursor-not-allowed',
          )}
          aria-label="Go to previous step"
        >
          {prevText}
        </button>

        {isLastStep ? (
          <button
            type="submit"
            onClick={onFinish}
            className={cn(
              'bg-primary text-primary-foreground px-6 py-2 rounded text-sm font-medium',
              'hover:bg-primary/90 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
            )}
          >
            {submitText}
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className={cn(
              'bg-primary text-primary-foreground px-4 py-2 rounded text-sm font-medium',
              'hover:bg-primary/90 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50',
            )}
            aria-label="Go to next step"
          >
            {nextText}
          </button>
        )}
      </div>
    </StepsContext.Provider>
  );
}

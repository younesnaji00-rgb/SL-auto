'use client';

/**
 * Radix DialogContent props that block outside-interaction dismissal while a
 * driver.js tour is active. The tour overlay's cutout can lag an animating
 * dialog, so a click meant for a control inside it may land on the overlay —
 * Radix would treat that as "outside" and silently close the dialog the step
 * is pointing at (this is how "clicking the recipient" used to skip the
 * send). Outside tours (`driver-active` absent — e.g. the firm's brand,
 * which never shows tutorials) behavior is unchanged.
 */
export function tourDialogGuard(): {
  onInteractOutside: (e: { preventDefault: () => void }) => void;
} {
  return {
    onInteractOutside: (e) => {
      try {
        if (document.body.classList.contains('driver-active')) e.preventDefault();
      } catch {
        /* non-fatal */
      }
    },
  };
}

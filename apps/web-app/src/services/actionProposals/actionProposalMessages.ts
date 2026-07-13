export function messageForActionProposalCallableError(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: unknown }).code
      : null

  switch (code) {
    case 'functions/deadline-exceeded':
      return 'This proposal has expired. Prepare a new job proposal to continue.'
    case 'functions/aborted':
      return 'This proposal is already being processed. Check its latest status before trying again.'
    case 'functions/failed-precondition':
      return 'This proposal cannot be confirmed and may require reconciliation. Check its latest status.'
    case 'functions/permission-denied':
      return 'You do not have permission to confirm this proposal.'
    default:
      return 'Unable to confirm this proposal. Check its latest status before trying again.'
  }
}

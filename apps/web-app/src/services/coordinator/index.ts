export * from './coordinatorRules'
export * from './coordinatorTelemetry'
export * from './operationsIntelligenceAgent'
export * from './workflowCoordinator'
export * from './workforceIntelligenceAgent'
export { workflowCoordinatorTools } from './workflowCoordinatorTools'

import { WorkflowCoordinator } from './workflowCoordinator'
import { workflowCoordinatorTools } from './workflowCoordinatorTools'
import { logCoordinatorTelemetry } from './coordinatorTelemetry'

export const workflowCoordinator = new WorkflowCoordinator({
  onTelemetryEvent: logCoordinatorTelemetry,
  tools: workflowCoordinatorTools,
})

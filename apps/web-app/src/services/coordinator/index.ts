export * from './coordinatorRules'
export * from './operationsIntelligenceAgent'
export * from './workflowCoordinator'
export * from './workforceIntelligenceAgent'
export { workflowCoordinatorTools } from './workflowCoordinatorTools'

import { WorkflowCoordinator } from './workflowCoordinator'
import { workflowCoordinatorTools } from './workflowCoordinatorTools'

export const workflowCoordinator = new WorkflowCoordinator({
  tools: workflowCoordinatorTools,
})

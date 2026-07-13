export * from './coordinatorRules'
export * from './workflowCoordinator'
export { workflowCoordinatorTools } from './workflowCoordinatorTools'

import { WorkflowCoordinator } from './workflowCoordinator'
import { workflowCoordinatorTools } from './workflowCoordinatorTools'

export const workflowCoordinator = new WorkflowCoordinator({
  tools: workflowCoordinatorTools,
})

/**
 * @file workflowTriggers.ts
 * @domain Workflows - Trigger Utilities
 * @description Helper functions to trigger workflows from anywhere in the app
 * @version 1.0.0
 */

import { supabaseUrl, publicAnonKey } from './supabase/info';
import type { WorkflowTriggerType } from '../types/workflow';

/**
 * Trigger workflows based on an event
 * 
 * @param triggerType - The type of trigger (e.g. 'EMPLOYEE_CREATED')
 * @param context - Context data for the workflow (must include user_id at minimum)
 * @returns Promise with trigger result
 * 
 * @example
 * ```typescript
 * await triggerWorkflow('LEARNING_VIDEO_COMPLETED', {
 *   user_id: currentUser.id,
 *   video_id: video.id,
 *   video_title: video.title,
 * });
 * ```
 */
export async function triggerWorkflow(
  triggerType: WorkflowTriggerType,
  context: Record<string, any>
): Promise<{
  success: boolean;
  triggered_workflows: number;
  workflows: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    console.log(`🔔 Triggering workflow: ${triggerType}`, context);
    
    const response = await fetch(
      `${supabaseUrl}/functions/v1/BrowoKoordinator-Workflows/trigger`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          trigger_type: triggerType,
          context: context
        })
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Trigger failed');
    }
    
    const result = await response.json();
    
    console.log(`✅ Triggered ${result.triggered_workflows} workflows for ${triggerType}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Failed to trigger workflow ${triggerType}:`, error);
    
    // Return error but don't throw - triggers should never block user experience
    return {
      success: false,
      triggered_workflows: 0,
      workflows: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Trigger workflow and wait for completion (blocking)
 * Use sparingly - only when you need to wait for workflow results
 */
export async function triggerWorkflowSync(
  triggerType: WorkflowTriggerType,
  context: Record<string, any>
): Promise<any> {
  const result = await triggerWorkflow(triggerType, context);
  
  if (!result.success) {
    throw new Error(result.error || 'Trigger failed');
  }
  
  return result;
}

/**
 * Trigger multiple workflows in parallel
 * Useful when multiple events happen at once
 * 
 * @example
 * ```typescript
 * await triggerWorkflows([
 *   { type: 'EMPLOYEE_CREATED', context: { user_id: newUser.id } },
 *   { type: 'EMPLOYEE_ADDED_TO_TEAM', context: { user_id: newUser.id, team_id: team.id } }
 * ]);
 * ```
 */
export async function triggerWorkflows(
  triggers: Array<{
    type: WorkflowTriggerType;
    context: Record<string, any>;
  }>
): Promise<Array<{
  triggerType: WorkflowTriggerType;
  success: boolean;
  triggered_workflows: number;
}>> {
  const results = await Promise.allSettled(
    triggers.map(t => triggerWorkflow(t.type, t.context))
  );
  
  return results.map((result, index) => ({
    triggerType: triggers[index].type,
    success: result.status === 'fulfilled' && result.value.success,
    triggered_workflows: result.status === 'fulfilled' ? result.value.triggered_workflows : 0,
  }));
}

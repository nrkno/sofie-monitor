import { SofieInstance } from '../sofieInstances/SofieInstance'

export { Criticality, DistributionStatus, ServiceMessage }

/**
 * Criticality level for service messages.
 *
 * @export
 * @enum {number}
 */
enum Criticality {
	/** Subject matter will affect operations. */
	CRITICAL = 1,
	/** Operations will not be affected, but non-critical functions may be affected or the result may be undesirable. */
	WARNING = 2,
	/** General information */
	NOTIFICATION = 3,
}

interface DistributionStatus {
	instance: SofieInstance
	isActive: boolean
}

interface ServiceMessage {
	_id?: string
	criticality: Criticality
	message: string
	sender?: string
	timestamp: Date
	isActive: boolean
	distributions: DistributionStatus[]
}

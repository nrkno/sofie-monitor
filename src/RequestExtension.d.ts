import { SofieInstance } from './data/sofieInstances/SofieInstance'

export interface RequestWithTimer extends Express.Request {
	refreshTimer?: number
}

export interface RequestWithInstances extends Express.Request {
	instances?: SofieInstance[]
}

import { IOAuthTokenResponse } from '../Model/IOAuthTokenResponse';
import AbstractPresence from './AbstractPresence';
import AbstractProfile from './AbstractProfile';

export interface IAccount {

    data : IOAuthTokenResponse;

    presences() : Promise<AbstractPresence>;

    refresh() : Promise<IOAuthTokenResponse>;

    profile() : Promise<AbstractProfile>;
}
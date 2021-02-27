import { IOAuthTokenResponse } from '../Model/IOAuthTokenResponse';
import AbstractPresence from './AbstractPresence';
import AbstractProfile from './AbstractProfile';

export interface IAccount {

    presences() : Promise<AbstractPresence>;

    refresh() : Promise<IOAuthTokenResponse>;

    data() : IOAuthTokenResponse;

    profile() : Promise<AbstractProfile>;
}
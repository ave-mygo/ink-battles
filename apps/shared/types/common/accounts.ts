import type { LoginMethod } from "../users/user";

export interface AccountBindingField {
	bound: boolean;
	value?: string | null;
}

export interface AccountBindingsDetails {
	email: AccountBindingField;
	qq: AccountBindingField;
	afdian: AccountBindingField;
	loginMethod?: LoginMethod | null;
}

export interface UserStore {
	uid: string;
	nickname: string;
	avatar: string;
	isLoggedIn: boolean;
}

export interface UserStoreData {
	user: UserStore | null;
	loading: boolean;
	setUser: (user: UserStore) => void;
	logout: () => void;
	clearStore: () => void;
	setLoading: (loading: boolean) => void;
}

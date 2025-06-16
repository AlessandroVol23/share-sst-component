export interface FetchError {
    code: number;
    message: string;
    error_chain?: FetchError[];
}
export interface FetchResult<ResultType> {
    success: boolean;
    result: ResultType;
    errors: FetchError[];
    messages?: string[];
    result_info?: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
    };
}
export declare function cfFetch<ResultType>(resource: string, init?: RequestInit): Promise<FetchResult<ResultType>>;

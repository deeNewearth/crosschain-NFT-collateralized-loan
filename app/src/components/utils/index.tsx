import {FunctionComponent} from 'react';

export function useQueryParams(){

    if(!window?.location?.search)
        return {};

    const urlSearchParams = new URLSearchParams(window.location.search);
    return Object.fromEntries(urlSearchParams);
} 

interface IAsyncResultBase {
    isLoading?: boolean;
    loadingPrompt?:string;
    error?: Error;
}

export interface IAsyncResult<T> extends IAsyncResultBase {
    result?: T;
}

export const ShowError: FunctionComponent<{ error: Error | undefined }> = ({ error }) => {
    if (!error)
        return <>&nbsp;</>;

    let errStr = error.message ?? `failed :${error}`;
    if(errStr.length>150){
        errStr = errStr.slice(0,150);
    }

    return <div className='text-center  py-2'>
        <span className='text-danger'> {errStr}</span>
    </div>;
}



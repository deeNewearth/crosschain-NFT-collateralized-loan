


export function ShowCompacted({str}:{
    type?:'address'
    str:string
}){

    if(!str)
        return null;

    const begin = str.substring(0,3);
    const end = str.substring(str.length -4);

    return <div className="d-flex flex-row showCompact">
        <span>{begin}...{end}</span>

    </div>;
}
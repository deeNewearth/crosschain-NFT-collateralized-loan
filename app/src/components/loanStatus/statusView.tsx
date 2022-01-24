import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import {Spinner} from 'react-bootstrap';

const loanSteps = {
    create_secret1:{order:1,description:'Create secret'},
    approveTransfer:{order:2,description:'Approve deposit'},
    askforloan_assetside:{order:3,description:'Deposit Collateral'},
    prepare_cash_vault:{order:4,description:'Prepare cash vault'},
};

const stepKeys = Object.keys(loanSteps).map(k1=>{
    const k = k1 as keyof typeof loanSteps;
    return {k,step:loanSteps[k]};
}).sort((a,b)=> a.step.order - b.step.order);
//.map(k=>({key:k.k,order:k.step.order}));

export type LoanStatus = {
    [Property in keyof typeof loanSteps]?: {
        tx?: string;
        completed?: boolean;
    }
}

export function LoanStatusView({ status }: { status: LoanStatus }) {

    const completedStep = stepKeys.find(s=>status[s.k]?.completed);

    return <div className="loanStatusView">

        <hr/>

        {stepKeys.map((s) => {

            const {k, step:{order, description}} = s;

            const completed = completedStep && order<completedStep.step.order;

            return <div key={k} className="d-flex justify-content-between py-1">

                <span className={(!!status[k] || completed)?'fw-bold':'text-muted'}>
                    {description}
                </span>

                {!!status[k]? <div>

                    {/*status[k]?.tx || ''*/}

                    {status[k]?.completed? 
                        <FontAwesomeIcon className="text-info" icon={faCheck}/>
                    :<Spinner animation="border" variant="info" />
                    }

                </div>:<div>
                    {completed && <FontAwesomeIcon className="text-info" icon={faCheck}/>}
                </div>
                }
                   
            </div>;
        })}

        <hr/>

    </div>;
}
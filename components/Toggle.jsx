import { motion } from "framer-motion";
import { CiBag1, CiLink } from "react-icons/ci";


const TOGGLE_CLASSES =
    "text-sm font-medium flex items-center gap-2 px-3 md:pl-3 md:pr-3.5 py-3 md:py-1.5  relative z-10";

const Toggle = ({ selected, setSelected }) => {
    return (
        <div className="relative flex w-fit items-center rounded-full">
            <button className={`${TOGGLE_CLASSES} ${selected === "SELLER" ? "text-white" : "text-dark"}`}
                onClick={() => setSelected("SELLER")} >
                <CiBag1 className="relative z-10 text-lg md:text-sm" />
                <span className="relative z-10">Vendedor</span>
            </button> 
            <button className={`${TOGGLE_CLASSES} ${selected === "AFFILIATE" ? "text-white" : "text-slate-800"}`}
                onClick={() => setSelected("AFFILIATE")} > <CiLink className="relative z-10 text-lg md:text-sm" />
                <span className="relative z-10">Afiliado</span>
            </button>
            <div className={`absolute inset-0 z-0 flex ${selected === "AFFILIATE" ? "justify-end" : "justify-start"}`} >
                <motion.span layout transition={{ type: "spring", damping: 15, stiffness: 250 }} className="h-full w-1/2 rounded-full bg-orange-600" />
            </div>
        </div>
    );
};
export default Toggle;
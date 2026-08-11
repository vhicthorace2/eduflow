import { useState } from "react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";

function Hambutton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav>
      <button onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
        {isOpen ? (
          <XMarkIcon className="w-3 h-3" />
        ) : (
          <Bars3Icon className="w-8 h-3" />
        )}
      </button>
      <div className={`${isOpen ? "block" : "hidden"} md:flex`}>
        {/* Navigation links */}
      </div>
    </nav>
  );
}

export default Hambutton;

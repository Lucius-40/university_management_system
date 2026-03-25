import { Loader2 } from 'lucide-react';

const Loader = () => {
  return (
    <div className="flex justify-center items-center py-8">
      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
    </div>
  );
};

export default Loader;
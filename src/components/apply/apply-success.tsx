import { CheckIcon } from "@/components/ui/icons";

interface ApplySuccessProps {
  supervisorName: string;
}

export function ApplySuccess({ supervisorName }: ApplySuccessProps) {
  return (
    <div className="px-6 py-12 text-center">
      <span className="w-10 h-10 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
        <CheckIcon className="w-5 h-5" />
      </span>
      <p className="font-semibold text-[15px] mt-3.5">Application submitted</p>
      <p className="text-ink-2 mt-1.5 max-w-[42ch] mx-auto">
        {supervisorName} has been notified and has five working days to respond.
        You&apos;ll hear from us either way.
      </p>
    </div>
  );
}

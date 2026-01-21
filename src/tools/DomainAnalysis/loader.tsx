"use client";

import { Skeleton } from "@heroui/react";
import { memo } from "react";

const DomainAnalysisLoader = () => {
  return (
    <>
      <div className="flex h-16 w-full flex-row items-center justify-between border-b-2 border-slate-200 bg-white px-4">
        <Skeleton className="h-6 w-full rounded-md" />
      </div>
      <div className="mt-8 w-full px-4 md:px-8">
        <Skeleton className="h-[200px] w-full rounded-md" />
      </div>
      <div className="domain-analysis-loader flex w-full flex-col gap-8 p-4 md:gap-4 md:p-8">
        <div className="h-[600px] w-full">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </div>
    </>
  );
};

export default memo(DomainAnalysisLoader);

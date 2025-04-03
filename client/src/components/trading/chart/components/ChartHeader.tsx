import React, { useCallback } from "react";
import { useIndicatorStore } from "../../stores/indicatorStore";
import { toast } from "react-hot-toast";

const ChartHeader: React.FC = () => {
  const handleAddIndicator = async (type: string) => {
    console.log(`ChartHeader - Selecting indicator type: ${type}`);
    try {
      console.log(`ChartHeader - Creating indicator of type ${type}`);
      const { createAndAddIndicator } = useIndicatorStore.getState();
      const id = createAndAddIndicator(type);
      console.log(`ChartHeader - Indicator created with ID: ${id}`);
    } catch (error) {
      console.error(`ChartHeader - Error creating indicator:`, error);
      toast.error(error instanceof Error ? error.message : "Failed to add indicator");
    }
  };

  return <div>{/* Render your component content here */}</div>;
};

export default ChartHeader;

"use client";

import React, { useEffect, useState } from "react";
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Flex,
  VStack,
  Text,
  Box,
  ColorPicker,
} from "@chakra-ui/react";
import { BaseIndicator } from "../indicators/base/types";
import { useIndicatorStore } from "../indicators/indicatorStore";
import { generateIndicatorKey } from "../core/ChartUtils";

interface IndicatorConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
  indicator?: BaseIndicator | null;
}

export function IndicatorConfigDialog({ isOpen, onClose, indicator }: IndicatorConfigDialogProps) {
  const [params, setParams] = useState<Record<string, any>>({});
  const [indicatorType, setIndicatorType] = useState<string>("");
  const [indicatorId, setIndicatorId] = useState<string>("");
  const { updateIndicator } = useIndicatorStore();

  // Initialize parameters when the indicator changes
  useEffect(() => {
    if (indicator) {
      const config = indicator.getConfiguration();
      setParams(config.parameters || {});
      setIndicatorType(indicator.getType());
      setIndicatorId(indicator.getId());
    } else {
      setParams({});
      setIndicatorType("");
      setIndicatorId("");
    }
  }, [indicator]);

  // Handle parameter change
  const handleParamChange = (name: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle number input change
  const handleNumberChange = (name: string, valueString: string, valueNumber: number) => {
    handleParamChange(name, valueNumber);
  };

  // Handle saving changes
  const handleSave = () => {
    if (indicator && indicatorType && indicatorId) {
      // Get the indicator key
      const key = generateIndicatorKey(indicatorType, indicatorId);

      // Update the indicator
      updateIndicator(key, params);

      // Close the dialog
      onClose();
    }
  };

  // Render form controls based on indicator type
  const renderControls = () => {
    if (!indicator) {
      return <Text>No indicator selected.</Text>;
    }

    const paramKeys = Object.keys(params);

    // Filter out internal parameters that shouldn't be visible/editable
    const visibleParams = paramKeys.filter((key) => !key.startsWith("_") && key !== "defaultParameters" && key !== "defaultPane" && typeof params[key] !== "object");

    return (
      <VStack spacing={4} align="stretch">
        {visibleParams.map((param) => {
          const value = params[param];

          // Render appropriate input based on type
          if (typeof value === "number") {
            return (
              <FormControl key={param}>
                <FormLabel>{param}</FormLabel>
                <NumberInput value={value} min={1} onChange={(valueString, valueNumber) => handleNumberChange(param, valueString, valueNumber)}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            );
          } else if (typeof value === "string" && param === "color") {
            return (
              <FormControl key={param}>
                <FormLabel>{param}</FormLabel>
                <ColorPicker value={value} onChange={(color) => handleParamChange(param, color)} />
              </FormControl>
            );
          } else if (typeof value === "string") {
            return (
              <FormControl key={param}>
                <FormLabel>{param}</FormLabel>
                <Input value={value} onChange={(e) => handleParamChange(param, e.target.value)} />
              </FormControl>
            );
          } else if (typeof value === "boolean") {
            return (
              <FormControl key={param}>
                <FormLabel>{param}</FormLabel>
                <Input type="checkbox" checked={value} onChange={(e) => handleParamChange(param, e.target.checked)} />
              </FormControl>
            );
          }

          return null;
        })}
      </VStack>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{indicator ? `Configure ${indicatorType} Indicator` : "Configure Indicator"}</ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <Box>{renderControls()}</Box>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="blue" onClick={handleSave} isDisabled={!indicator}>
            Save Changes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

"use client";

import React, { useState } from "react";
import { Button, Dialog, Menu, MenuItem, MenuList, MenuButton, Flex, Text, IconButton, Box, Tooltip } from "@chakra-ui/react";
import { ChevronDownIcon, PlusIcon, XIcon } from "lucide-react";
import { useIndicatorStore, createAndAddIndicator } from "../indicators/indicatorStore";
import { indicatorDefaults, IndicatorType } from "../core/ChartTypes";
import { BaseIndicator } from "../indicators/base/types";

interface IndicatorControlsProps {
  onOpenConfigDialog?: (indicator: BaseIndicator) => void;
}

export function IndicatorControls({ onOpenConfigDialog }: IndicatorControlsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { indicators, removeIndicator, toggleVisibility, getIndicator } = useIndicatorStore();

  // Get a list of active indicators
  const activeIndicators = Object.entries(indicators).map(([key, indicator]) => ({
    key,
    type: indicator.getType(),
    name: indicator.getName(),
    visible: indicator.isVisible(),
  }));

  // Handle adding an indicator
  const handleAddIndicator = (type: string) => {
    try {
      createAndAddIndicator(type);
      setIsOpen(false);
    } catch (error) {
      console.error(`Error adding indicator of type ${type}:`, error);
    }
  };

  // Handle removing an indicator
  const handleRemoveIndicator = (key: string) => {
    removeIndicator(key);
  };

  // Handle toggling visibility
  const handleToggleVisibility = (key: string) => {
    toggleVisibility(key);
  };

  // Handle opening config dialog
  const handleOpenConfig = (key: string) => {
    if (onOpenConfigDialog) {
      const indicator = getIndicator(key);
      if (indicator) {
        onOpenConfigDialog(indicator);
      }
    }
  };

  // Get available indicator types
  const availableIndicators = Object.keys(indicatorDefaults);

  return (
    <Flex direction="column" gap={2} p={2}>
      {/* Add Indicator Button */}
      <Menu>
        <MenuButton as={Button} size="sm" variant="outline" colorScheme="blue" rightIcon={<ChevronDownIcon size={16} />} leftIcon={<PlusIcon size={16} />}>
          Add Indicator
        </MenuButton>
        <MenuList>
          {availableIndicators.map((type) => (
            <MenuItem key={type} onClick={() => handleAddIndicator(type)}>
              {type}
            </MenuItem>
          ))}
        </MenuList>
      </Menu>

      {/* Active Indicators List */}
      {activeIndicators.length > 0 && (
        <Box mt={2} border="1px" borderColor="gray.200" borderRadius="md" p={2}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            Active Indicators
          </Text>
          <Flex direction="column" gap={1}>
            {activeIndicators.map(({ key, type, name, visible }) => (
              <Flex key={key} justify="space-between" align="center" p={1} borderRadius="md" bg={visible ? "blue.50" : "gray.50"}>
                <Tooltip label={visible ? "Hide indicator" : "Show indicator"}>
                  <Text fontSize="sm" cursor="pointer" opacity={visible ? 1 : 0.6} onClick={() => handleToggleVisibility(key)}>
                    {name || type}
                  </Text>
                </Tooltip>
                <Flex gap={1}>
                  <Button size="xs" variant="ghost" onClick={() => handleOpenConfig(key)}>
                    Edit
                  </Button>
                  <IconButton size="xs" variant="ghost" colorScheme="red" aria-label="Remove indicator" icon={<XIcon size={14} />} onClick={() => handleRemoveIndicator(key)} />
                </Flex>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
    </Flex>
  );
}

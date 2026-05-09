// Calculator.js

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BUTTON_MARGIN = 1;
const BUTTON_SIZE = (SCREEN_WIDTH - BUTTON_MARGIN * 5) / 4; 
// 4 buttons per row, 5 margins (left/right on each button)

export default function Calculator() {
  const [display, setDisplay] = useState('0');
  const [operator, setOperator] = useState(null);
  const [prevValue, setPrevValue] = useState(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);

  const handleClear = () => {
    setDisplay('0');
    setOperator(null);
    setPrevValue(null);
    setWaitingForNewValue(false);
  };

  const handleNumber = (num) => {
    if (waitingForNewValue) {
      // Start fresh for next operand
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      // Append digit (avoid leading zeros)
      setDisplay((prev) =>
        prev === '0' ? num : prev + num
      );
    }
  };

  const handleDecimal = () => {
    if (waitingForNewValue) {
      // If operator was just pressed, start new number "0."
      setDisplay('0.');
      setWaitingForNewValue(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay((prev) => prev + '.');
    }
  };

  const handleToggleSign = () => {
    setDisplay((prev) =>
      prev.startsWith('-') ? prev.slice(1) : '-' + prev
    );
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    if (!isNaN(current)) {
      setDisplay(String(current / 100));
    }
  };

  const performCalculation = () => {
    if (operator && prevValue !== null) {
      const current = parseFloat(display);
      let result = 0;

      switch (operator) {
        case '÷':
          result = prevValue / current;
          break;
        case '×':
          result = prevValue * current;
          break;
        case '−':
          result = prevValue - current;
          break;
        case '+':
          result = prevValue + current;
          break;
        default:
          return;
      }

      // Prevent occasional floating‐point weirdness
      const rounded = Math.round(result * 1000000000) / 1000000000;
      setDisplay(String(rounded));
      setPrevValue(rounded);
      setOperator(null);
      setWaitingForNewValue(true);
    }
  };

  const handleOperatorPress = (op) => {
    const current = parseFloat(display);

    if (prevValue === null) {
      // First time pressing an operator
      setPrevValue(current);
    } else if (!waitingForNewValue) {
      // Chain calculation
      let result = 0;
      switch (operator) {
        case '÷':
          result = prevValue / current;
          break;
        case '×':
          result = prevValue * current;
          break;
        case '−':
          result = prevValue - current;
          break;
        case '+':
          result = prevValue + current;
          break;
        default:
          result = current;
      }
      const rounded = Math.round(result * 1000000000) / 1000000000;
      setPrevValue(rounded);
      setDisplay(String(rounded));
    }

    setOperator(op);
    setWaitingForNewValue(true);
  };

  const renderButton = (text, onPress, style = {}) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.button, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.buttonText, style.textColor && { color: style.textColor }]}>
          {text}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Display */}
      <View style={styles.displayContainer}>
        <Text style={styles.displayText} numberOfLines={1}>
          {display}
        </Text>
      </View>

      {/* Button rows */}
      <View style={styles.buttonsContainer}>
        {/* Row 1 */}
        <View style={styles.row}>
          {renderButton('AC', handleClear, {
            backgroundColor: '#d4d4d2',
            textColor: '#000',
          })}
          {renderButton('±', handleToggleSign, {
            backgroundColor: '#d4d4d2',
            textColor: '#000',
          })}
          {renderButton('%', handlePercent, {
            backgroundColor: '#d4d4d2',
            textColor: '#000',
          })}
          {renderButton('÷', () => handleOperatorPress('÷'), {
            backgroundColor: '#ff9500',
            textColor: '#fff',
          })}
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          {renderButton('7', () => handleNumber('7'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('8', () => handleNumber('8'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('9', () => handleNumber('9'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('×', () => handleOperatorPress('×'), {
            backgroundColor: '#ff9500',
            textColor: '#fff',
          })}
        </View>

        {/* Row 3 */}
        <View style={styles.row}>
          {renderButton('4', () => handleNumber('4'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('5', () => handleNumber('5'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('6', () => handleNumber('6'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('−', () => handleOperatorPress('−'), {
            backgroundColor: '#ff9500',
            textColor: '#fff',
          })}
        </View>

        {/* Row 4 */}
        <View style={styles.row}>
          {renderButton('1', () => handleNumber('1'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('2', () => handleNumber('2'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('3', () => handleNumber('3'), {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('+', () => handleOperatorPress('+'), {
            backgroundColor: '#ff9500',
            textColor: '#fff',
          })}
        </View>

        {/* Row 5 */}
        <View style={styles.row}>
          {/* '0' spans two button widths */}
          <TouchableOpacity
            onPress={() => handleNumber('0')}
            style={[
              styles.button,
              {
                width: BUTTON_SIZE * 2 + BUTTON_MARGIN,
                borderRadius: BUTTON_SIZE / 2,
                backgroundColor: '#333333',
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>0</Text>
          </TouchableOpacity>

          {renderButton('.', handleDecimal, {
            backgroundColor: '#333333',
            textColor: '#fff',
          })}
          {renderButton('=', performCalculation, {
            backgroundColor: '#ff9500',
            textColor: '#fff',
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  displayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingRight: 20,
    paddingBottom: 10,
  },
  displayText: {
    fontSize: 80,
    color: '#fff',
    textAlign: 'right',
  },
  buttonsContainer: {
    paddingBottom: 20,
    // each row has 4 buttons with small margins
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: BUTTON_MARGIN,
    marginBottom: BUTTON_MARGIN,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: BUTTON_MARGIN / 2,
  },
  buttonText: {
    fontSize: 32,
    color: '#fff',
  },
});

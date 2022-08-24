import find from "lodash.find";
import reduce from "lodash.reduce";
import head from "lodash.head";
import tail from "lodash.tail";
import memoize from "lodash.memoize";
import trim from "lodash.trim";
import startsWith from "lodash.startswith";

import countryData from "./country_data";

class PhoneNumberFormatter {
  public constructor(private readonly inputNumber: string) {}

  public formatPhone() {
    let onlyCountries = countryData.allCountries;

    const inputNumber = this.inputNumber;

    let countryGuess;
    if (inputNumber.length > 1) {
      // Country detect by value field
      countryGuess =
        this.guessSelectedCountry(
          inputNumber.replace(/\D/g, "").substring(0, 6),
          onlyCountries,
          ""
        ) || 0;
    } else {
      // Empty params
      countryGuess = 0;
    }

    const dialCode =
      inputNumber.length < 2 &&
      countryGuess &&
      !startsWith(inputNumber.replace(/\D/g, ""), countryGuess.dialCode)
        ? countryGuess.dialCode
        : "";

    const formattedNumber =
      inputNumber === "" && countryGuess === 0
        ? ""
        : this.formatNumber(
            dialCode + inputNumber.replace(/\D/g, ""),
            countryGuess.name ? countryGuess.format : undefined
          );

    return formattedNumber;
  }

  private formatNumber = (text: any, pattern: any) => {
    const disableCountryCode = false;
    const enableLongNumbers = false;
    const autoFormat = true;

    if (!text || text.length === 0) {
      return disableCountryCode ? "" : "+";
    }

    // for all strings with length less than 3, just return it (1, 2 etc.)
    // also return the same text if the selected country has no fixed format
    if ((text && text.length < 2) || !pattern || !autoFormat) {
      return disableCountryCode ? text : `+${text}`;
    }

    const formattedObject = reduce(
      pattern,
      (acc, character) => {
        if (acc.remainingText.length === 0) {
          return acc;
        }

        if (character !== ".") {
          return {
            formattedText: acc.formattedText + character,
            remainingText: acc.remainingText,
          };
        }

        return {
          formattedText: acc.formattedText + head(acc.remainingText),
          remainingText: tail(acc.remainingText),
        };
      },
      {
        formattedText: "",
        remainingText: text.split(""),
      }
    );

    let formattedNumber;
    if (enableLongNumbers) {
      formattedNumber =
        formattedObject.formattedText + formattedObject.remainingText.join("");
    } else {
      formattedNumber = formattedObject.formattedText;
    }

    // Always close brackets
    if (formattedNumber.includes("(") && !formattedNumber.includes(")"))
      formattedNumber += ")";
    return formattedNumber;
  };

  private guessSelectedCountry = memoize(
    (inputNumber, onlyCountries, defaultCountry) => {
      const secondBestGuess =
        find(onlyCountries, { iso2: defaultCountry }) || {};
      if (trim(inputNumber) === "") return secondBestGuess;

      const bestGuess = reduce(
        onlyCountries,
        (selectedCountry, country) => {
          if (startsWith(inputNumber, country.dialCode)) {
            if (country.dialCode.length > selectedCountry.dialCode.length) {
              return country;
            }
            if (
              country.dialCode.length === selectedCountry.dialCode.length &&
              country.priority < selectedCountry.priority
            ) {
              return country;
            }
          }
          return selectedCountry;
        },
        { dialCode: "", priority: 10001 }
      );

      // @ts-ignore
      if (!bestGuess.name) return secondBestGuess;
      return bestGuess;
    }
  );
}

export default function formatPhone(phone: string): string {
  const formatter = new PhoneNumberFormatter(phone);
  return formatter.formatPhone();
}

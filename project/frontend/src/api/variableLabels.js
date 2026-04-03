// Maps internal variable names (backend) → display labels (UI)
export const variableDisplayMap = {
  "Corporate Income": "India Inc Corporate Earnings",
  "Credit card transactions": "Value of credit card transactions",
  "Demand deposits (SCB)": "Balance in savings accounts",
  "International travellers": "# Indians traveling abroad",
  "Female representation in corporates": "Women participation in corporates",
  "Vol_SPBIO/SPIB": "SPIB to SPBIO+ upgrades",
  "NIFTY 50": "NIFTY 50",
  "Repo Rate": "Repo Rate",
  "Domestic Air Traffic": "Domestic Air Traffic Vol",
  "GST Collections": "Total GST Collections",
  "Labour force (LDA-35)": "Population LDA-35 years",
  "Vol_SPIB/Prem": "Premium to SPIB upgrade",
  "Automobile sales": "4-Wheeler Sales",
  "Corporate salaries": "Corporate Salaries",
  "IIP": "Index of Industrial Production",
  "National Highway (km)": "New Highway construction",
  "Prem/Del Vol": "Deluxe to Premium Upgrade",
  "SIP Contributions to Mutual Funds": "SIP Contributions to Mutual Funds",
  "Urbanization": "Ratio of Urban Population",
  "number of Post-Graduates": "Number of Post-Graduates",
  "2-Wheelers Production": "2-Wheelers Production",
  "Debit card transactions": "Value of Debit Card Transactions",
  "Labour_20-24_Urban": "New Entrants to Labor Force",
  "PFCE": "Consumption Expenditure",
  "Rainfall (mm)": "Annual Rainfall",
  "Value of UPI transactions": "Value of UPI transactions",
  "Vol_Del/Val": "Value to Deluxe upgrade",
  "Yield per Hectare_Foodgrains": "Foodgrain productivity"
}

export const displayVar = (name) => {
  if (!name) return name
  return variableDisplayMap[name] || name
}

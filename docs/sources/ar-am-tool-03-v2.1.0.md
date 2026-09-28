# A/R Methodological Tool — "Calculation of the number of sample plots for measurements within A/R CDM project activities" (Version 2.1.0)

Source: https://cdm.unfccc.int/methodologies/ARmethodologies/tools/ar-am-tool-03-v2.1.0.pdf (EB 58, Report Annex 15). Text extracted because the UNFCCC site blocks direct downloads (Incapsula). Formulas are quoted in the tool's own notation.

## I. Scope, applicability and assumptions

1. This tool can be used for calculation of number of sample plots required for estimation of biomass stocks from sampling based measurements in the baseline and project scenarios of an A/R CDM project activity.
2. The tool calculates the number of required sample plots on the basis of the specified targeted precision for biomass stocks to be estimated.
3. All parameters used in calculation of plot level biomass stock (e.g. biomass expansion factors, root-shoot ratios) are considered fixed constants. Similarly, all models used for calculation of plot level biomass stock (e.g. volume tables or equations, allometric equations) are considered to be fixed.

**Assumptions:**

(a) Approximate value of the area of each stratum within the project boundary is known;
(b) Approximate value of the variance of biomass stocks in each stratum is known from a preliminary sample, existing data related to the project area, or existing data related to a similar area;
(c) The project area is stratified into one or more strata.

**Parameters determined by the tool:**

- In the baseline scenario: n_BSL for n, and n_i_BSL for n_i
- In the project scenario: n_PROJ for n, and n_i_PROJ for n_i

## II. Calculation of number of sample plots required

7. Number of sample plots required depends upon the targeted precision and the variability of the biomass stock being estimated.
8. Targeted precision is specified by the methodology applying this tool.
9. The project area is stratified on the basis of the variability of the biomass stock being estimated, and approximate area of each stratum is determined. If the biomass stock being estimated is the sum of biomass stocks in two or more pools, stratification is carried out on the basis of the variability of the biomass stock of the dominant pool (i.e. the pool containing the largest amount of biomass stock).
10. Variability is expressed as the standard deviation of biomass stock in the stratum (s_i), known from existing data applicable to the project area or a similar area, or estimated from a preliminary sample or an expert judgment.
11. Number of sample plots required within the project boundary is calculated iteratively. In the first iteration:

**Equation 1:**

```
        N · t²_VAL · ( Σ (w_i · s_i) )²
n  =  ─────────────────────────────────────
      N · E²  +  t²_VAL · Σ (w_i · s_i²)
```

where:
- n — number of sample plots required within the project boundary (dimensionless)
- N — total number of possible sample plots within the project boundary (the sampling space or the population) = A / AP (dimensionless)
- t_VAL — two-sided Student's t-value, at infinite degrees of freedom, for the required confidence level (dimensionless)
- w_i — relative weight of the area of stratum i (area of stratum i divided by the project area) (dimensionless)
- s_i — estimated standard deviation of biomass stock in stratum i (t d.m. or t d.m. ha⁻¹)
- E — acceptable margin of error (i.e. one-half the confidence interval) in estimation of biomass stock within the project boundary (same units as s_i)
- i = 1, 2, 3, ... biomass stock estimation strata within the project boundary

12. If n from the first iteration is **30 or more**, no further iteration is carried out; the first-iteration n is final.
13. If n from the first iteration is **less than 30**, Equation 1 is applied in a second iteration using the t-value for degrees of freedom equal to (n − 1). The second-iteration n is final.

14. For a **small sampling fraction** (area sampled < 5% of the project area), the simplified equation may be used:

**Equation 2 (simplified):**

```
n  =  ( t_VAL / E )²  ·  ( Σ (w_i · s_i) )²
```

15. For a **large sampling fraction** (area sampled > 5% of the project area), the number of plots from Equation 1 is adjusted as:

**Equation 3 (adjustment):**

```
n_a = n / (1 + n / N)
```

where n_a is the adjusted number of sample plots, n from Equation 1, N the total possible plots.

16. The method of **optimum allocation** is used for allocating plots among strata:

**Equation 4 (allocation):**

```
           w_i · s_i
n_i = n · ───────────
          Σ (w_i · s_i)
```

where n_i — number of sample plots allocated to stratum i.

## III. Data and parameters used in the tool

Standard CDM data-parameter tables (monitored / not monitored) follow in the original document.

## IV. References

All references are quoted in the tool's annexes.

---

### Notes for this implementation

- The Winrock Excel tool's per-stratum rounding (round **up** each n_i, minimum 1 per
  stratum) is an Excel-tool convention on top of this methodology; the methodology
  itself does not mandate it.
- The tool's t_VAL at infinite degrees of freedom corresponds to the standard normal
  quantile: 1.645 for 90% confidence, 1.96 for 95% (two-sided).

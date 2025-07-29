exports.getPercentage = (prev_count, curr_count) => {
  let growth = 0;
  if (prev_count === 0 && curr_count === 0) growth = 0; // No change
  else if (prev_count === 0) growth = 100; // From 0 to something = 100% growth
  else if (curr_count === 0) growth = 0;
  else
    growth =
      prev_count === 0 ? 100 : ((curr_count - prev_count) / prev_count) * 100;
  return growth ?? 0;
};

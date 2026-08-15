class ConceptDriftDetector:
    """
    Implements Page-Hinkley test to detect concept drift in network traffic.
    Distinguishes legitimate permanent network shifts from transient attacks.
    """
    def __init__(self, delta=0.005, threshold=50.0, alpha=0.99):
        self.delta = delta        # Minimum magnitude of drift
        self.threshold = threshold# Decision threshold for drift alarm
        self.alpha = alpha        # Exponential decay
        
        self.mean = 0.0
        self.sum = 0.0
        self.min_sum = 0.0
        self.sample_count = 0
        self.drift_detected = False

    def add_element(self, x):
        """
        Updates Page-Hinkley cumulative sum with new metric sample.
        Returns True if drift threshold is crossed.
        """
        self.sample_count += 1
        # Sequential mean update
        self.mean = self.mean + (x - self.mean) / self.sample_count
        
        # Cumulative sum difference
        self.sum = self.sum + (x - self.mean - self.delta)
        if self.sum < self.min_sum:
            self.min_sum = self.sum
            
        ph_stat = self.sum - self.min_sum
        if ph_stat > self.threshold:
            self.drift_detected = True
            return True, round(ph_stat, 2)
            
        self.drift_detected = False
        return False, round(ph_stat, 2)

    def reset(self):
        self.mean = 0.0
        self.sum = 0.0
        self.min_sum = 0.0
        self.sample_count = 0
        self.drift_detected = False

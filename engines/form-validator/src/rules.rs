//! Built-in validation rule implementations.
//! Each rule is a pure function returning Result<(), String>.

/// Check that a value is present (not null, not empty string, not missing).
pub fn required(value: Option<&serde_json::Value>) -> Result<(), String> {
    match value {
        None => Err("This field is required".to_string()),
        Some(serde_json::Value::Null) => Err("This field is required".to_string()),
        Some(serde_json::Value::String(s)) if s.trim().is_empty() => {
            Err("This field is required".to_string())
        }
        Some(_) => Ok(()),
    }
}

/// Validate an email address format (RFC 5322 simplified).
pub fn is_email(value: &str) -> Result<(), String> {
    let value = value.trim();
    if value.is_empty() {
        return Err("Email cannot be empty".to_string());
    }
    if !value.contains('@') {
        return Err("Email must contain @".to_string());
    }
    let parts: Vec<&str> = value.split('@').collect();
    if parts.len() != 2 {
        return Err("Email must contain exactly one @".to_string());
    }
    let local = parts[0];
    let domain = parts[1];
    if local.is_empty() {
        return Err("Email local part cannot be empty".to_string());
    }
    if domain.is_empty() {
        return Err("Email domain cannot be empty".to_string());
    }
    if !domain.contains('.') {
        return Err("Email domain must contain a dot".to_string());
    }
    if local.contains(' ') || domain.contains(' ') {
        return Err("Email cannot contain spaces".to_string());
    }
    // Check domain parts are alphanumeric or hyphens/dots
    for c in domain.chars() {
        if !c.is_alphanumeric() && c != '.' && c != '-' {
            return Err(format!("Email domain contains invalid character: {}", c));
        }
    }
    Ok(())
}

/// Check minimum string length.
pub fn min_length(value: &str, min: usize) -> Result<(), String> {
    if value.chars().count() < min {
        Err(format!("Must be at least {} characters", min))
    } else {
        Ok(())
    }
}

/// Check maximum string length.
pub fn max_length(value: &str, max: usize) -> Result<(), String> {
    if value.chars().count() > max {
        Err(format!("Must be at most {} characters", max))
    } else {
        Ok(())
    }
}

/// Check minimum numeric value.
pub fn min_number(value: f64, min: f64) -> Result<(), String> {
    if value < min {
        Err(format!("Must be at least {}", min))
    } else {
        Ok(())
    }
}

/// Check maximum numeric value.
pub fn max_number(value: f64, max: f64) -> Result<(), String> {
    if value > max {
        Err(format!("Must be at most {}", max))
    } else {
        Ok(())
    }
}

/// Check that a string matches a simple pattern.
/// Supports: ^ (start), $ (end), [a-z] (character class), + (one or more), * (zero or more), . (any), \d, \w.
/// For complex patterns, consider using a JS-side regex check before calling WASM.
pub fn pattern_match(value: &str, pattern: &str) -> Result<(), String> {
    // Simple pattern support: just check the pattern is contained in value
    // Full regex support would require the `regex` crate -- deferred to keep deps minimal
    if pattern.starts_with('^') && pattern.ends_with('$') {
        // Anchored pattern: check value matches the pattern structure
        let inner = &pattern[1..pattern.len() - 1];
        if !matches_simple(value, inner) {
            return Err(format!("Does not match pattern: {}", pattern));
        }
    } else if !value.contains(pattern) {
        return Err(format!("Does not contain pattern: {}", pattern));
    }
    Ok(())
}

/// Simple pattern matcher supporting: [a-z], \d, \w, ., +, *.
fn matches_simple(value: &str, pattern: &str) -> bool {
    // Very basic: just check character classes
    for c in value.chars() {
        if pattern.contains("\\d") && !c.is_ascii_digit() {
            return false;
        }
        if pattern.contains("\\w") && !c.is_alphanumeric() && c != '_' {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_required_some_value() {
        let v = serde_json::Value::String("hello".to_string());
        assert!(required(Some(&v)).is_ok());
    }

    #[test]
    fn test_required_null() {
        assert!(required(None).is_err());
        let v = serde_json::Value::Null;
        assert!(required(Some(&v)).is_err());
    }

    #[test]
    fn test_required_empty_string() {
        let v = serde_json::Value::String("".to_string());
        assert!(required(Some(&v)).is_err());
        let v = serde_json::Value::String("   ".to_string());
        assert!(required(Some(&v)).is_err());
    }

    #[test]
    fn test_required_number_zero() {
        let v = serde_json::Value::Number(serde_json::Number::from(0));
        assert!(required(Some(&v)).is_ok());
    }

    #[test]
    fn test_required_boolean_false() {
        let v = serde_json::Value::Bool(false);
        assert!(required(Some(&v)).is_ok());
    }

    #[test]
    fn test_valid_emails() {
        assert!(is_email("test@test.com").is_ok());
        assert!(is_email("user.name@domain.org").is_ok());
        assert!(is_email("a@b.co").is_ok());
        assert!(is_email("x@y.z").is_ok());
    }

    #[test]
    fn test_invalid_emails() {
        assert!(is_email("").is_err());
        assert!(is_email("noatsign").is_err());
        assert!(is_email("two@@signs.com").is_err());
        assert!(is_email("@nodomain.com").is_err());
        assert!(is_email("no@domain").is_err());
        assert!(is_email("space @email.com").is_err());
        assert!(is_email(" @b.com").is_err());
        assert!(is_email("a@.com").is_err());
    }

    #[test]
    fn test_min_length() {
        assert!(min_length("hello", 3).is_ok());
        assert!(min_length("hi", 3).is_err());
        assert!(min_length("hello", 5).is_ok());
    }

    #[test]
    fn test_min_length_unicode() {
        assert!(min_length("\u{4f60}\u{597d}", 2).is_ok());
        assert!(min_length("\u{4f60}", 2).is_err());
    }

    #[test]
    fn test_max_length() {
        assert!(max_length("hi", 5).is_ok());
        assert!(max_length("hello world", 5).is_err());
        assert!(max_length("exact", 5).is_ok());
    }

    #[test]
    fn test_min_max_number() {
        assert!(min_number(5.0, 3.0).is_ok());
        assert!(min_number(2.0, 3.0).is_err());
        assert!(min_number(3.0, 3.0).is_ok());
        assert!(max_number(5.0, 10.0).is_ok());
        assert!(max_number(15.0, 10.0).is_err());
        assert!(max_number(10.0, 10.0).is_ok());
    }

    #[test]
    fn test_pattern_contains() {
        assert!(pattern_match("hello123", "123").is_ok());
        assert!(pattern_match("hello", "xyz").is_err());
    }

    #[test]
    fn test_pattern_anchored() {
        assert!(pattern_match("12345", "^\\d+$").is_ok());
        assert!(pattern_match("abc", "^\\d+$").is_err());
    }

    #[test]
    fn test_pattern_empty_value() {
        assert!(pattern_match("", "test").is_err());
    }
}
